// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useLocale } from 'next-intl';
import ReactMarkdown, { type Components } from 'react-markdown';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  complete?: boolean;
  lastFree?: boolean;
};
type PaywallState = 'free' | 'paywall' | 'unlocked';
type Reason = 'wrong' | 'irrelevant' | 'hallucinated' | 'other';

type FeedbackState =
  | { kind: 'up' }
  | {
      kind: 'down';
      reason: Reason;
      comment: string;
      email: string;
      submitting: boolean;
      errored: boolean;
    }
  | { kind: 'submitted' };

type AccessState = {
  unlocked: boolean;
  expires: number;
  freeCount: number;
};

const ACCESS_KEY = 'bgm_chat_access';
const ACCESS_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const FREE_LIMIT = 3;
const PROVIDER = 'anthropic' as const;
const REASON_ORDER: Reason[] = ['wrong', 'irrelevant', 'hallucinated', 'other'];
const DEFAULT_ACCESS: AccessState = { unlocked: false, expires: 0, freeCount: 0 };

const SUGGESTED: Record<string, string[]> = {
  fr: [
    'Quels dossiers sont en crise ?',
    'État du budget 2026',
    'Dossiers mobilité actifs',
    'Quels acteurs surveille BGM ?',
  ],
  nl: [
    'Welke dossiers zijn in crisis?',
    'Stand van begroting 2026',
    'Actieve mobiliteitsdossiers',
    'Welke actoren volgt BGM?',
  ],
  en: [
    'Which dossiers are in crisis?',
    '2026 budget status',
    'Active mobility dossiers',
    'Who does BGM monitor?',
  ],
  de: [
    'Welche Dossiers sind in der Krise?',
    'Budget 2026 Stand',
    'Aktive Mobilitätsdossiers',
    'Wer wird von BGM beobachtet?',
  ],
};

type PaywallCopy = { title: string; body: string; button: string; link: string };
const PAYWALL: Record<string, PaywallCopy> = {
  fr: {
    title: "L'assistant BGM a un coût réel",
    body: "Ce projet fonctionne sans publicité, sans subvention, sans tracking. Chaque requête IA est financée de ma poche. Si BGM vous est utile, contribuez pour continuer à accéder à l'assistant et soutenir le monitoring indépendant.",
    button: 'Débloquer pour 5 EUR →',
    link: 'Peut-être plus tard',
  },
  nl: {
    title: 'De BGM-assistent heeft een echte kost',
    body: 'Dit project werkt zonder reclame, zonder subsidies, zonder tracking. Elke AI-aanvraag wordt uit eigen zak betaald. Als BGM nuttig voor u is, draag bij om de assistent toegankelijk te houden en onafhankelijke monitoring te ondersteunen.',
    button: 'Ontgrendelen voor 5 EUR →',
    link: 'Misschien later',
  },
  en: {
    title: 'The BGM assistant has a real cost',
    body: 'This project runs without ads, without subsidies, without tracking. Every AI request comes out of my own pocket. If BGM is useful to you, contribute to keep the assistant accessible and support independent monitoring.',
    button: 'Unlock for 5 EUR →',
    link: 'Maybe later',
  },
  de: {
    title: 'Der BGM-Assistent hat echte Kosten',
    body: 'Dieses Projekt funktioniert ohne Werbung, ohne Subventionen, ohne Tracking. Jede KI-Anfrage wird aus eigener Tasche bezahlt. Wenn BGM für Sie nützlich ist, tragen Sie dazu bei, den Assistenten zugänglich zu halten.',
    button: 'Für 5 EUR freischalten →',
    link: 'Vielleicht später',
  },
};

const LAST_FREE: Record<string, string> = {
  fr: "C'est votre dernière réponse gratuite. Ce projet a un coût réel.",
  nl: 'Dit is uw laatste gratis antwoord. Dit project heeft een echte kost.',
  en: 'This is your last free response. This project has a real cost.',
  de: 'Dies ist Ihre letzte kostenlose Antwort. Dieses Projekt hat echte Kosten.',
};

const DISCLAIMER: Record<string, string> = {
  fr: 'Réponses générées par IA — vérifiez sur les fiches dossiers.',
  nl: "AI-gegenereerde antwoorden — controleer op de dossierpagina's.",
  en: 'AI-generated responses — verify on the dossier pages.',
  de: 'KI-generierte Antworten — prüfen Sie die Dossierseiten.',
};

type FeedbackCopy = {
  useful: string;
  report: string;
  reasons: Record<Reason, string>;
  commentPlaceholder: string;
  emailPlaceholder: string;
  send: string;
  sending: string;
  thanks: string;
  errorMsg: string;
};

const FEEDBACK: Record<string, FeedbackCopy> = {
  fr: {
    useful: 'Utile',
    report: 'Signaler un problème',
    reasons: {
      wrong: 'Réponse incorrecte',
      irrelevant: 'Hors sujet',
      hallucinated: 'Information inventée',
      other: 'Autre',
    },
    commentPlaceholder: 'Décrivez le problème (optionnel)',
    emailPlaceholder: 'Votre email (optionnel)',
    send: 'Envoyer',
    sending: 'Envoi…',
    thanks: 'Merci pour votre retour.',
    errorMsg: "Erreur lors de l'envoi. Réessayez.",
  },
  nl: {
    useful: 'Nuttig',
    report: 'Probleem melden',
    reasons: {
      wrong: 'Onjuist antwoord',
      irrelevant: 'Niet relevant',
      hallucinated: 'Verzonnen info',
      other: 'Andere',
    },
    commentPlaceholder: 'Beschrijf het probleem (optioneel)',
    emailPlaceholder: 'Uw e-mail (optioneel)',
    send: 'Verzenden',
    sending: 'Verzenden…',
    thanks: 'Bedankt voor uw feedback.',
    errorMsg: 'Fout bij het verzenden. Probeer opnieuw.',
  },
  en: {
    useful: 'Useful',
    report: 'Report a problem',
    reasons: {
      wrong: 'Incorrect answer',
      irrelevant: 'Off topic',
      hallucinated: 'Hallucinated info',
      other: 'Other',
    },
    commentPlaceholder: 'Describe the issue (optional)',
    emailPlaceholder: 'Your email (optional)',
    send: 'Send',
    sending: 'Sending…',
    thanks: 'Thank you for your feedback.',
    errorMsg: 'Failed to send. Please try again.',
  },
  de: {
    useful: 'Hilfreich',
    report: 'Problem melden',
    reasons: {
      wrong: 'Falsche Antwort',
      irrelevant: 'Nicht relevant',
      hallucinated: 'Erfundene Info',
      other: 'Andere',
    },
    commentPlaceholder: 'Problem beschreiben (optional)',
    emailPlaceholder: 'Ihre E-Mail (optional)',
    send: 'Senden',
    sending: 'Senden…',
    thanks: 'Danke für Ihr Feedback.',
    errorMsg: 'Senden fehlgeschlagen. Bitte erneut versuchen.',
  },
};

const DOSSIER_MARKER_RE = /\[Dossier\s*:\s*([a-z0-9-]+)\]/g;

type UmamiWindow = Window & {
  umami?: { track?: (event: string, data?: Record<string, unknown>) => void };
};

function trackEvent(event: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  (window as UmamiWindow).umami?.track?.(event, data);
}

function linkifyDossierMarkers(text: string, locale: string): string {
  return text.replace(
    DOSSIER_MARKER_RE,
    (_m, slug: string) => `[[Dossier : ${slug}]](/${locale}/dossiers/${slug})`,
  );
}

function readAccess(): AccessState {
  if (typeof window === 'undefined') return DEFAULT_ACCESS;
  try {
    const raw = window.localStorage.getItem(ACCESS_KEY);
    if (!raw) return DEFAULT_ACCESS;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_ACCESS;
    const obj = parsed as Record<string, unknown>;
    return {
      unlocked: obj.unlocked === true,
      expires: typeof obj.expires === 'number' ? obj.expires : 0,
      freeCount: typeof obj.freeCount === 'number' ? obj.freeCount : 0,
    };
  } catch {
    return DEFAULT_ACCESS;
  }
}

function writeAccess(patch: Partial<AccessState>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readAccess();
    const next: AccessState = { ...current, ...patch };
    window.localStorage.setItem(ACCESS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — persistence silently skipped */
  }
}

function incrementFreeCount(): number {
  const current = readAccess();
  const next = current.freeCount + 1;
  writeAccess({ freeCount: next });
  return next;
}

function isUnlocked(access: AccessState): boolean {
  return access.unlocked && access.expires > Date.now();
}

export function ChatWidget() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [paywallState, setPaywallState] = useState<PaywallState>('free');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [feedback, setFeedback] = useState<Record<number, FeedbackState>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const access = readAccess();
    if (isUnlocked(access)) {
      setPaywallState('unlocked');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('chat_unlocked') === '1') {
      writeAccess({ unlocked: true, expires: Date.now() + ACCESS_TTL_MS });
      params.delete('chat_unlocked');
      const qs = params.toString();
      const newUrl =
        window.location.pathname +
        (qs ? `?${qs}` : '') +
        window.location.hash;
      window.history.replaceState({}, '', newUrl);
      setPaywallState('unlocked');
      return;
    }

    if (access.freeCount >= FREE_LIMIT) {
      setPaywallState('paywall');
    }
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = useCallback(
    async (override?: string) => {
      const text = (override ?? input).trim();
      if (!text || loading) return;

      const accessBefore = readAccess();
      const tier: 'free' | 'paid' = isUnlocked(accessBefore) ? 'paid' : 'free';
      const isThirdFree =
        !isUnlocked(accessBefore) && accessBefore.freeCount === FREE_LIMIT - 1;

      const next: Message[] = [...messages, { role: 'user', content: text }];
      setMessages([
        ...next,
        { role: 'assistant', content: '', lastFree: isThirdFree },
      ]);
      setInput('');
      setLoading(true);
      trackEvent('chatbot:question_sent', { tier, locale });

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: next,
            provider: PROVIDER,
            locale,
            tier,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const copy = prev.slice();
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = {
              role: 'assistant',
              content: (last?.content ?? '') + chunk,
              lastFree: last?.lastFree,
            };
            return copy;
          });
        }

        setMessages((prev) => {
          const copy = prev.slice();
          const last = copy[copy.length - 1];
          if (last && last.role === 'assistant') {
            copy[copy.length - 1] = { ...last, complete: true };
          }
          return copy;
        });

        if (tier === 'free') {
          const newCount = incrementFreeCount();
          if (newCount >= FREE_LIMIT) {
            setPaywallState('paywall');
            trackEvent('chatbot:paywall_shown', { locale });
          }
        }
      } catch {
        setMessages((prev) => {
          const copy = prev.slice();
          copy[copy.length - 1] = {
            role: 'assistant',
            content: 'Une erreur est survenue. Veuillez réessayer.',
          };
          return copy;
        });
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, locale],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  async function onCheckout() {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    trackEvent('chatbot:checkout_clicked', { locale });
    try {
      const res = await fetch('/api/chat/checkout', { method: 'POST' });
      const data: { url?: string } = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      /* swallow — reset loading below */
    }
    setCheckoutLoading(false);
  }

  function thumbsUp(i: number) {
    setFeedback((prev) => ({ ...prev, [i]: { kind: 'up' } }));
    trackEvent('chatbot:feedback_up', { locale });
  }

  function thumbsDown(i: number) {
    setFeedback((prev) => ({
      ...prev,
      [i]: {
        kind: 'down',
        reason: 'wrong',
        comment: '',
        email: '',
        submitting: false,
        errored: false,
      },
    }));
    trackEvent('chatbot:feedback_down_opened', { locale });
  }

  function updateDown(i: number, patch: Partial<Extract<FeedbackState, { kind: 'down' }>>) {
    setFeedback((prev) => {
      const current = prev[i];
      if (!current || current.kind !== 'down') return prev;
      return { ...prev, [i]: { ...current, ...patch } };
    });
  }

  async function submitFeedback(i: number) {
    const state = feedback[i];
    if (!state || state.kind !== 'down' || state.submitting) return;

    const assistantMsg = messages[i];
    const prevUser = messages
      .slice(0, i)
      .reverse()
      .find((m) => m.role === 'user');
    if (!assistantMsg || assistantMsg.role !== 'assistant' || !prevUser) return;

    updateDown(i, { submitting: true, errored: false });

    try {
      const res = await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: state.reason,
          userQuestion: prevUser.content.slice(0, 500),
          assistantAnswer: assistantMsg.content.slice(0, 1000),
          comment: state.comment || undefined,
          email: state.email || undefined,
          provider: PROVIDER,
          locale,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setFeedback((prev) => ({ ...prev, [i]: { kind: 'submitted' } }));
      trackEvent('chatbot:feedback_submitted', {
        locale,
        reason: state.reason,
      });
    } catch {
      updateDown(i, { submitting: false, errored: true });
    }
  }

  const suggestions = SUGGESTED[locale] ?? SUGGESTED.fr;
  const paywallCopy = PAYWALL[locale] ?? PAYWALL.fr;
  const fc = FEEDBACK[locale] ?? FEEDBACK.fr;
  const lastFreeBanner = LAST_FREE[locale] ?? LAST_FREE.fr;

  const markdownComponents: Components = {
    a: ({ children, href, ...rest }) => {
      const isExternal =
        typeof href === 'string' && /^https?:\/\//i.test(href);
      return (
        <a
          {...rest}
          href={href}
          {...(isExternal
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {})}
          className="break-all text-brand-900 underline decoration-brand-900/40 underline-offset-2 hover:decoration-brand-900"
        >
          {children}
        </a>
      );
    },
    p: ({ children }) => <p className="my-1 first:mt-0 last:mb-0">{children}</p>,
    h1: ({ children }) => (
      <h1 className="mt-2 mb-1 text-base font-semibold first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-2 mb-1 text-sm font-semibold first:mt-0">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-2 mb-1 text-sm font-semibold first:mt-0">{children}</h3>
    ),
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => (
      <ul className="my-1 list-disc space-y-0.5 pl-4">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-1 list-decimal space-y-0.5 pl-4">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-snug">{children}</li>,
    code: ({ children }) => (
      <code className="rounded bg-neutral-200 px-1 py-0.5 font-mono text-xs">
        {children}
      </code>
    ),
  };

  function renderAssistantBody(m: Message, isLast: boolean): ReactNode {
    if (!m.content) {
      return loading && isLast ? '…' : '';
    }
    return (
      <ReactMarkdown components={markdownComponents}>
        {linkifyDossierMarkers(m.content, locale)}
      </ReactMarkdown>
    );
  }

  function renderFeedbackBar(i: number): ReactNode {
    const state = feedback[i];

    if (state?.kind === 'submitted') {
      return <p className="mt-1 text-xs text-neutral-600">{fc.thanks}</p>;
    }

    const upActive = state?.kind === 'up';
    const downActive = state?.kind === 'down';

    return (
      <div className="mt-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => thumbsUp(i)}
            aria-label={fc.useful}
            aria-pressed={upActive}
            title={fc.useful}
            className={
              'rounded-md px-2 py-1 text-xs leading-none transition focus:outline-none focus:ring-2 focus:ring-brand-900 ' +
              (upActive
                ? 'bg-brand-900 text-neutral-50'
                : 'text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900')
            }
          >
            <span aria-hidden="true">{'👍'}</span>
          </button>
          <button
            type="button"
            onClick={() => thumbsDown(i)}
            aria-label={fc.report}
            aria-pressed={downActive}
            title={fc.report}
            className={
              'rounded-md px-2 py-1 text-xs leading-none transition focus:outline-none focus:ring-2 focus:ring-brand-900 ' +
              (downActive
                ? 'bg-neutral-200 text-neutral-900'
                : 'text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900')
            }
          >
            <span aria-hidden="true">{'👎'}</span>
          </button>
        </div>

        {state?.kind === 'down' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitFeedback(i);
            }}
            className="mt-2 space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-2"
          >
            <label className="block">
              <span className="sr-only">{fc.report}</span>
              <select
                value={state.reason}
                onChange={(e) => updateDown(i, { reason: e.target.value as Reason })}
                disabled={state.submitting}
                className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs text-neutral-900 focus:border-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {REASON_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {fc.reasons[r]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="sr-only">{fc.commentPlaceholder}</span>
              <textarea
                value={state.comment}
                onChange={(e) => updateDown(i, { comment: e.target.value.slice(0, 500) })}
                placeholder={fc.commentPlaceholder}
                rows={2}
                maxLength={500}
                disabled={state.submitting}
                className="w-full resize-none rounded-md border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="sr-only">{fc.emailPlaceholder}</span>
              <input
                type="email"
                value={state.email}
                onChange={(e) => updateDown(i, { email: e.target.value })}
                placeholder={fc.emailPlaceholder}
                disabled={state.submitting}
                className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            {state.errored && (
              <p className="text-xs text-status-delayed">{fc.errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={state.submitting}
              className="rounded-md bg-brand-900 px-3 py-1 text-xs font-medium text-neutral-50 transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state.submitting ? fc.sending : fc.send}
            </button>
          </form>
        )}
      </div>
    );
  }

  // Build-time kill-switch. NEXT_PUBLIC_CHATBOT_ENABLED is inlined by Next.js,
  // so this value is stable across renders. Placed AFTER all hooks to satisfy
  // react-hooks/rules-of-hooks — hooks still run, but nothing renders.
  if (process.env.NEXT_PUBLIC_CHATBOT_ENABLED !== 'true') return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          trackEvent('chatbot:opened', { locale });
        }}
        aria-label="Ouvrir l'assistant BGM"
        className="fixed bottom-6 left-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-brand-900 text-neutral-50 shadow-lg transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-900 focus:ring-offset-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Assistant BGM"
      className="fixed bottom-0 left-4 right-4 z-[9999] flex max-h-[85vh] flex-col rounded-t-xl border border-neutral-200 bg-neutral-50 shadow-2xl sm:bottom-20 sm:left-4 sm:right-auto sm:h-[560px] sm:max-h-[85vh] sm:w-[380px] sm:rounded-xl"
    >
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Assistant BGM</p>
          <p className="text-xs text-neutral-500">Monitoring de la gouvernance bruxelloise</p>
          <p className="mt-0.5 text-xs italic text-neutral-500">
            {DISCLAIMER[locale] ?? DISCLAIMER.fr}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer"
          className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3"
        aria-live="polite"
      >
        {messages.length === 0 && paywallState !== 'paywall' ? (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">
              Posez une question sur les dossiers surveillés par le Brussels Governance Monitor.
            </p>
            <ul className="space-y-2">
              {suggestions.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => send(q)}
                    disabled={loading}
                    className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-sm text-neutral-800 transition hover:border-brand-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              if (m.role === 'user') {
                return (
                  <li
                    key={i}
                    className="ml-8 max-w-[85%] self-end overflow-hidden break-words rounded-lg bg-brand-900 px-3 py-2 text-sm text-neutral-50"
                  >
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  </li>
                );
              }
              return (
                <li key={i} className="mr-8 max-w-[90%]">
                  <div className="overflow-hidden break-words rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-900">
                    <div className="space-y-1 [overflow-wrap:anywhere] [word-break:break-word]">
                      {renderAssistantBody(m, isLast)}
                    </div>
                  </div>
                  {m.lastFree && (
                    <p className="mt-1 rounded-md border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs text-neutral-600">
                      {lastFreeBanner}
                    </p>
                  )}
                  {m.complete && renderFeedbackBar(i)}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {paywallState === 'paywall' ? (
        <div className="border-t border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-semibold text-neutral-900">{paywallCopy.title}</p>
          <p className="mt-2 text-sm text-neutral-700">{paywallCopy.body}</p>
          <button
            type="button"
            onClick={onCheckout}
            disabled={checkoutLoading}
            className="mt-3 w-full rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-neutral-50 transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {paywallCopy.button}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 block w-full text-center text-xs text-neutral-500 hover:text-neutral-900 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-900"
          >
            {paywallCopy.link}
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="border-t border-neutral-200 p-3"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Votre question…"
              aria-label="Votre question"
              className="max-h-32 min-h-[38px] flex-1 resize-none rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-neutral-50 transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
