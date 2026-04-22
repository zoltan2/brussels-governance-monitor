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
import { useRouter } from 'next/navigation';
import ReactMarkdown, { type Components } from 'react-markdown';
import { CHAT_SUGGESTIONS } from '@/lib/chat-suggestions';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  complete?: boolean;
  lastFree?: boolean;
};
type PaywallState =
  | 'free'
  | 'choice'
  | 'email-form'
  | 'email-gated'
  | 'paywall'
  | 'unlocked';
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
  emailGated?: boolean;
  emailGatedAt?: number;
};

const ACCESS_KEY = 'bgm_chat_access';
const RATED_KEY = 'bgm_chat_session_rated';
const ACCESS_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const FREE_LIMIT = 3;
const EMAIL_GATED_LIMIT = 13; // 3 free + 10 post-email-gate
const PROVIDER = 'anthropic' as const;
const REASON_ORDER: Reason[] = ['wrong', 'irrelevant', 'hallucinated', 'other'];
const DEFAULT_ACCESS: AccessState = {
  unlocked: false,
  expires: 0,
  freeCount: 0,
  emailGated: false,
};

// Suggested questions live in src/lib/chat-suggestions.ts — imported so both
// the widget (render) and the pre-generation script (cache) share one source
// of truth.
const SUGGESTED = CHAT_SUGGESTIONS;

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

type ChoiceCopy = {
  title: string;
  subtitle: string;
  optionEmail: string;
  optionEmailHint: string;
  optionPay: string;
  optionPayHint: string;
  skip: string;
};
const CHOICE: Record<string, ChoiceCopy> = {
  fr: {
    title: 'Vous avez utilisé vos 3 questions gratuites',
    subtitle: 'Comment souhaitez-vous continuer ?',
    optionEmail: 'Continuer avec votre email',
    optionEmailHint: '+10 questions gratuites',
    optionPay: 'Débloquer pour 5 EUR',
    optionPayHint: 'Accès complet 90 jours',
    skip: 'Plus tard',
  },
  nl: {
    title: 'U hebt uw 3 gratis vragen gebruikt',
    subtitle: 'Hoe wilt u verdergaan?',
    optionEmail: 'Doorgaan met uw e-mail',
    optionEmailHint: '+10 gratis vragen',
    optionPay: 'Ontgrendelen voor 5 EUR',
    optionPayHint: 'Volledige toegang 90 dagen',
    skip: 'Later',
  },
  en: {
    title: 'You have used your 3 free questions',
    subtitle: 'How would you like to continue?',
    optionEmail: 'Continue with your email',
    optionEmailHint: '+10 free questions',
    optionPay: 'Unlock for 5 EUR',
    optionPayHint: 'Full access for 90 days',
    skip: 'Maybe later',
  },
  de: {
    title: 'Sie haben Ihre 3 kostenlosen Fragen verbraucht',
    subtitle: 'Wie möchten Sie fortfahren?',
    optionEmail: 'Mit Ihrer E-Mail weitermachen',
    optionEmailHint: '+10 kostenlose Fragen',
    optionPay: 'Für 5 EUR freischalten',
    optionPayHint: 'Voller Zugang 90 Tage',
    skip: 'Später',
  },
};

type EmailFormCopy = {
  title: string;
  subtitle: string;
  emailPlaceholder: string;
  digestLabel: string;
  digestHint: string;
  submit: string;
  submitting: string;
  back: string;
  disclaimer: string;
  errorInvalid: string;
  errorGeneric: string;
  success: string;
  successWithOptIn: string;
};
const EMAIL_FORM: Record<string, EmailFormCopy> = {
  fr: {
    title: 'Votre email pour continuer',
    subtitle:
      'Entrez votre email pour débloquer 10 questions supplémentaires — gratuites.',
    emailPlaceholder: 'vous@exemple.be',
    digestLabel: 'Je souhaite recevoir les communications de BGM',
    digestHint:
      'Digest hebdomadaire + annonces occasionnelles (nouveaux dossiers, événements, actualités du projet). Désinscription en 1 clic.',
    submit: 'Continuer',
    submitting: 'Envoi…',
    back: '← Retour',
    disclaimer:
      'Votre email ne sert qu’à poursuivre votre session. Aucune publicité.',
    errorInvalid: 'Email invalide.',
    errorGeneric: 'Une erreur est survenue. Réessayez.',
    success: 'Merci. 10 questions débloquées.',
    successWithOptIn:
      'Merci. 10 questions débloquées. Vérifiez vos mails pour confirmer votre inscription au digest.',
  },
  nl: {
    title: 'Uw e-mail om verder te gaan',
    subtitle:
      'Voer uw e-mailadres in om 10 extra gratis vragen te ontgrendelen.',
    emailPlaceholder: 'u@voorbeeld.be',
    digestLabel: 'Ik wil communicatie van BGM ontvangen',
    digestHint:
      'Wekelijkse digest + occasionele aankondigingen (nieuwe dossiers, evenementen, projectupdates). Uitschrijven in één klik.',
    submit: 'Doorgaan',
    submitting: 'Verzenden…',
    back: '← Terug',
    disclaimer:
      'Uw e-mail wordt alleen gebruikt om uw sessie voort te zetten. Geen reclame.',
    errorInvalid: 'Ongeldig e-mailadres.',
    errorGeneric: 'Er is een fout opgetreden. Probeer opnieuw.',
    success: 'Bedankt. 10 vragen ontgrendeld.',
    successWithOptIn:
      'Bedankt. 10 vragen ontgrendeld. Controleer uw e-mail om uw digest-inschrijving te bevestigen.',
  },
  en: {
    title: 'Your email to continue',
    subtitle:
      'Enter your email to unlock 10 more free questions.',
    emailPlaceholder: 'you@example.com',
    digestLabel: 'I would like to receive updates from BGM',
    digestHint:
      'Weekly digest plus occasional announcements (new dossiers, events, project updates). Unsubscribe in one click.',
    submit: 'Continue',
    submitting: 'Sending…',
    back: '← Back',
    disclaimer:
      'Your email is only used to continue your session. No advertising.',
    errorInvalid: 'Invalid email.',
    errorGeneric: 'Something went wrong. Please try again.',
    success: 'Thanks. 10 questions unlocked.',
    successWithOptIn:
      'Thanks. 10 questions unlocked. Check your email to confirm your digest subscription.',
  },
  de: {
    title: 'Ihre E-Mail zum Fortfahren',
    subtitle:
      'Geben Sie Ihre E-Mail ein, um 10 weitere kostenlose Fragen freizuschalten.',
    emailPlaceholder: 'sie@beispiel.de',
    digestLabel: 'Ich möchte Mitteilungen von BGM erhalten',
    digestHint:
      'Wöchentlicher Digest + gelegentliche Ankündigungen (neue Dossiers, Veranstaltungen, Projekt-Updates). Abmeldung mit einem Klick.',
    submit: 'Weiter',
    submitting: 'Senden…',
    back: '← Zurück',
    disclaimer:
      'Ihre E-Mail wird nur zur Fortsetzung Ihrer Sitzung verwendet. Keine Werbung.',
    errorInvalid: 'Ungültige E-Mail.',
    errorGeneric: 'Ein Fehler ist aufgetreten. Bitte erneut versuchen.',
    success: 'Danke. 10 Fragen freigeschaltet.',
    successWithOptIn:
      'Danke. 10 Fragen freigeschaltet. Überprüfen Sie Ihre E-Mail, um die Digest-Anmeldung zu bestätigen.',
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

type UiCopy = {
  title: string;
  subtitle: string;
  openAria: string;
  closeAria: string;
  dialogAria: string;
  emptyPrompt: string;
  inputPlaceholder: string;
  inputAria: string;
  send: string;
  sending: string;
  errorMessage: string;
};

const RESPONSE_DISCLAIMER: Record<string, string> = {
  fr: 'Une imprécision ? Signalez-la via les pouces ci-dessous.',
  nl: 'Een onjuistheid opgemerkt? Meld het met de duimen hieronder.',
  en: 'Spotted an inaccuracy? Flag it with the thumbs below.',
  de: 'Eine Ungenauigkeit bemerkt? Melden Sie sie mit den Daumen unten.',
};

type RatingCopy = {
  title: string;
  skip: string;
  thanks: string;
  labels: [string, string, string]; // 1, 2, 3 (insatisfait, neutre, satisfait)
};

const RATING: Record<string, RatingCopy> = {
  fr: {
    title: "Comment s'est passé votre échange ?",
    skip: 'Plus tard',
    thanks: 'Merci pour votre retour.',
    labels: ['Pas satisfait', 'Moyen', 'Très satisfait'],
  },
  nl: {
    title: 'Hoe was uw gesprek?',
    skip: 'Later',
    thanks: 'Bedankt voor uw feedback.',
    labels: ['Niet tevreden', 'Neutraal', 'Zeer tevreden'],
  },
  en: {
    title: 'How was your conversation?',
    skip: 'Maybe later',
    thanks: 'Thank you for your feedback.',
    labels: ['Dissatisfied', 'Neutral', 'Very satisfied'],
  },
  de: {
    title: 'Wie war Ihr Gespräch?',
    skip: 'Später',
    thanks: 'Danke für Ihr Feedback.',
    labels: ['Unzufrieden', 'Neutral', 'Sehr zufrieden'],
  },
};

const UI: Record<string, UiCopy> = {
  fr: {
    title: 'Assistant BGM',
    subtitle: 'Monitoring de la gouvernance bruxelloise',
    openAria: "Ouvrir l'assistant BGM",
    closeAria: 'Fermer',
    dialogAria: 'Assistant BGM',
    emptyPrompt:
      'Posez une question sur les dossiers surveillés par le Brussels Governance Monitor.',
    inputPlaceholder: 'Votre question…',
    inputAria: 'Votre question',
    send: 'Envoyer',
    sending: 'Envoi…',
    errorMessage: 'Une erreur est survenue. Veuillez réessayer.',
  },
  nl: {
    title: 'BGM-assistent',
    subtitle: 'Monitoring van het Brusselse bestuur',
    openAria: 'BGM-assistent openen',
    closeAria: 'Sluiten',
    dialogAria: 'BGM-assistent',
    emptyPrompt:
      'Stel een vraag over de dossiers die door de Brussels Governance Monitor worden opgevolgd.',
    inputPlaceholder: 'Uw vraag…',
    inputAria: 'Uw vraag',
    send: 'Verzenden',
    sending: 'Verzenden…',
    errorMessage: 'Er is een fout opgetreden. Probeer opnieuw.',
  },
  en: {
    title: 'BGM Assistant',
    subtitle: 'Monitoring Brussels governance',
    openAria: 'Open the BGM assistant',
    closeAria: 'Close',
    dialogAria: 'BGM Assistant',
    emptyPrompt:
      'Ask a question about the dossiers tracked by the Brussels Governance Monitor.',
    inputPlaceholder: 'Your question…',
    inputAria: 'Your question',
    send: 'Send',
    sending: 'Sending…',
    errorMessage: 'Something went wrong. Please try again.',
  },
  de: {
    title: 'BGM-Assistent',
    subtitle: 'Monitoring der Brüsseler Politik',
    openAria: 'BGM-Assistenten öffnen',
    closeAria: 'Schließen',
    dialogAria: 'BGM-Assistent',
    emptyPrompt:
      'Stellen Sie eine Frage zu den vom Brussels Governance Monitor überwachten Dossiers.',
    inputPlaceholder: 'Ihre Frage…',
    inputAria: 'Ihre Frage',
    send: 'Senden',
    sending: 'Senden…',
    errorMessage: 'Es ist ein Fehler aufgetreten. Bitte erneut versuchen.',
  },
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

/**
 * Escape characters that have meaning inside markdown link syntax
 * (brackets + backslashes). Titles come from content MDX so they're trusted,
 * but a stray `]` or `\` in a title would break the generated link.
 */
function escapeMarkdown(label: string): string {
  return label.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

type UmamiWindow = Window & {
  umami?: { track?: (event: string, data?: Record<string, unknown>) => void };
};

function trackEvent(event: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  (window as UmamiWindow).umami?.track?.(event, data);
}

function linkifyDossierMarkers(
  text: string,
  locale: string,
  titles: Record<string, string>,
): string {
  return text.replace(DOSSIER_MARKER_RE, (_m, slug: string) => {
    const label = titles[slug] ?? slug;
    return `[${escapeMarkdown(label)}](/${locale}/dossiers/${slug})`;
  });
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
      emailGated: obj.emailGated === true,
      emailGatedAt:
        typeof obj.emailGatedAt === 'number' ? obj.emailGatedAt : undefined,
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [paywallState, setPaywallState] = useState<PaywallState>('free');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [feedback, setFeedback] = useState<Record<number, FeedbackState>>({});
  const [showRating, setShowRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [dossierTitles, setDossierTitles] = useState<Record<string, string>>({});
  const [emailInput, setEmailInput] = useState('');
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [emailHoneypot, setEmailHoneypot] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<'invalid' | 'generic' | null>(null);
  const [emailSuccessWithOptIn, setEmailSuccessWithOptIn] = useState<boolean | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Strip ?chat_unlocked=1 from the URL on every mount if present — don't
    // leave a shareable unlock token in the address bar. Runs independently
    // of the localStorage check below.
    const params = new URLSearchParams(window.location.search);
    const hasUnlockParam = params.get('chat_unlocked') === '1';
    if (hasUnlockParam) {
      params.delete('chat_unlocked');
      const qs = params.toString();
      const newUrl =
        window.location.pathname +
        (qs ? `?${qs}` : '') +
        window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }

    const access = readAccess();
    if (isUnlocked(access)) {
      setPaywallState('unlocked');
      return;
    }

    if (hasUnlockParam) {
      writeAccess({ unlocked: true, expires: Date.now() + ACCESS_TTL_MS });
      setPaywallState('unlocked');
      return;
    }

    // Email-gated user who hit the extended limit → Stripe paywall only.
    if (access.emailGated && access.freeCount >= EMAIL_GATED_LIMIT) {
      setPaywallState('paywall');
      return;
    }

    // Email-gated user still within extended quota → normal chat.
    if (access.emailGated) {
      setPaywallState('email-gated');
      return;
    }

    // First barrier exhausted, no email yet → show the 3-option choice card.
    if (access.freeCount >= FREE_LIMIT) {
      setPaywallState('choice');
    }
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Load localized dossier titles so chips show the localized name instead of
  // the slug (slugs are French-only in the content collection).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/chat/dossier-titles?locale=${encodeURIComponent(locale)}`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: unknown) => {
        if (cancelled) return;
        if (data && typeof data === 'object') {
          setDossierTitles(data as Record<string, string>);
        }
      })
      .catch(() => {
        /* fallback: chips will fall back to slug text */
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) requestClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, messages, paywallState, showRating]);

  const send = useCallback(
    async (override?: string) => {
      const text = (override ?? input).trim();
      if (!text || loading) return;

      const accessBefore = readAccess();
      const tier: 'free' | 'paid' = isUnlocked(accessBefore) ? 'paid' : 'free';
      // "Last free response" banner fires on the last question before the
      // next gate: Q3 for non-email-gated users, Q13 for email-gated users.
      const currentLimit = accessBefore.emailGated
        ? EMAIL_GATED_LIMIT
        : FREE_LIMIT;
      const isLastFree =
        !isUnlocked(accessBefore) && accessBefore.freeCount === currentLimit - 1;

      const next: Message[] = [...messages, { role: 'user', content: text }];
      setMessages([
        ...next,
        { role: 'assistant', content: '', lastFree: isLastFree },
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
          const accessNow = readAccess();
          if (accessNow.emailGated) {
            // Email-gated user: only Stripe after the extended quota.
            if (newCount >= EMAIL_GATED_LIMIT) {
              setPaywallState('paywall');
              trackEvent('chatbot:paywall_shown', { locale });
            }
          } else {
            // Pre-email user: offer the 3-option card at the first limit.
            if (newCount >= FREE_LIMIT) {
              setPaywallState('choice');
              trackEvent('chatbot:choice_shown', { locale });
            }
          }
        }
      } catch {
        const localizedError =
          (UI[locale] ?? UI.fr).errorMessage;
        setMessages((prev) => {
          const copy = prev.slice();
          copy[copy.length - 1] = {
            role: 'assistant',
            content: localizedError,
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

  function chooseEmailOption() {
    trackEvent('chatbot:choice_email_selected', { locale });
    setEmailError(null);
    setEmailSuccessWithOptIn(null);
    setPaywallState('email-form');
  }

  function backToChoice() {
    setEmailError(null);
    setPaywallState('choice');
  }

  async function submitEmailGate(e: React.FormEvent) {
    e.preventDefault();
    if (emailSubmitting) return;

    const email = emailInput.trim();
    // Cheap client-side format check — the server also validates via Zod.
    const looksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!looksValid) {
      setEmailError('invalid');
      return;
    }

    setEmailSubmitting(true);
    setEmailError(null);

    try {
      const res = await fetch('/api/chat/email-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          optInDigest: emailOptIn,
          locale,
          website: emailHoneypot, // honeypot — real users leave this empty
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Persist unlock locally. Chat resumes regardless of Resend outcome.
      writeAccess({
        emailGated: true,
        emailGatedAt: Date.now(),
      });
      trackEvent('chatbot:email_gate_passed', {
        locale,
        opt_in_digest: emailOptIn,
      });
      setEmailSuccessWithOptIn(emailOptIn);

      // Show success message for ~1.2s, then return to chat.
      setTimeout(() => {
        setPaywallState('email-gated');
        setEmailInput('');
        setEmailOptIn(false);
        setEmailHoneypot('');
        setEmailSuccessWithOptIn(null);
      }, 1200);
    } catch {
      setEmailError('generic');
    } finally {
      setEmailSubmitting(false);
    }
  }

  function requestClose() {
    // Trigger the session rating once per browser session if the user had
    // enough interaction and is not already staring at the paywall.
    if (typeof window !== 'undefined') {
      const alreadyRated = window.localStorage.getItem(RATED_KEY) === '1';
      const userTurns = messages.filter((m) => m.role === 'user').length;
      if (
        !alreadyRated &&
        userTurns >= 2 &&
        paywallState !== 'paywall' &&
        !showRating
      ) {
        setShowRating(true);
        return;
      }
    }
    setOpen(false);
  }

  function markRated() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(RATED_KEY, '1');
    } catch {
      /* storage may be unavailable */
    }
  }

  async function submitRating(value: 1 | 2 | 3) {
    const userTurns = messages.filter((m) => m.role === 'user').length;
    markRated();
    trackEvent('chatbot:session_rated', { locale, value });
    try {
      await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'session-rating',
          value,
          messageCount: userTurns,
          provider: PROVIDER,
          locale,
        }),
      });
    } catch {
      /* fire-and-forget */
    }
    setRatingSubmitted(true);
    // Show the "thanks" for a beat, then close.
    setTimeout(() => {
      setShowRating(false);
      setRatingSubmitted(false);
      setOpen(false);
    }, 900);
  }

  function skipRating() {
    markRated();
    trackEvent('chatbot:session_rating_skipped', { locale });
    setShowRating(false);
    setOpen(false);
  }

  function thumbsUp(i: number) {
    setFeedback((prev) => ({ ...prev, [i]: { kind: 'up' } }));
    trackEvent('chatbot:feedback_up', { locale });

    // Fire-and-forget: log on server so the digest / admin page can count ups.
    const assistantMsg = messages[i];
    const prevUser = messages
      .slice(0, i)
      .reverse()
      .find((m) => m.role === 'user');
    if (assistantMsg?.role === 'assistant' && prevUser) {
      fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'up',
          userQuestion: prevUser.content.slice(0, 500),
          assistantAnswer: assistantMsg.content.slice(0, 1000),
          provider: PROVIDER,
          locale,
        }),
      }).catch(() => {
        /* fire-and-forget */
      });
    }
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
  const ui = UI[locale] ?? UI.fr;

  const markdownComponents: Components = {
    a: ({ children, href, ...rest }) => {
      const isExternal =
        typeof href === 'string' && /^https?:\/\//i.test(href);

      if (isExternal) {
        // External URL: subtle inline reference, muted color, dotted underline.
        // Break on any char if the domain is long.
        return (
          <a
            {...rest}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="[word-break:break-all] text-neutral-600 underline decoration-dotted decoration-neutral-400 underline-offset-2 transition hover:text-brand-900 hover:decoration-brand-900"
          >
            {children}
          </a>
        );
      }

      // Internal dossier link → chip style, scannable as a reference.
      // Soft-nav via Next router so the widget stays mounted.
      return (
        <a
          {...rest}
          href={href}
          onClick={(e) => {
            if (
              e.metaKey ||
              e.ctrlKey ||
              e.shiftKey ||
              e.altKey ||
              e.button !== 0
            ) {
              return;
            }
            e.preventDefault();
            if (href) router.push(href);
          }}
          className="mx-0.5 inline-flex items-center rounded border border-brand-900/20 bg-brand-900/5 px-1.5 py-0.5 text-xs font-medium text-brand-900 no-underline transition hover:border-brand-900/40 hover:bg-brand-900/10"
        >
          {children}
        </a>
      );
    },
    p: ({ children }) => (
      <p className="my-2.5 first:mt-0 last:mb-0 leading-relaxed">{children}</p>
    ),
    // H1/H2/H3 shouldn't appear in chat answers (system prompt forbids them),
    // but render them as plain bold paragraphs if the model slips up — avoids
    // breaking the visual rhythm with a giant section header in a narrow panel.
    h1: ({ children }) => (
      <p className="my-2.5 font-semibold leading-relaxed">{children}</p>
    ),
    h2: ({ children }) => (
      <p className="my-2.5 font-semibold leading-relaxed">{children}</p>
    ),
    h3: ({ children }) => (
      <p className="my-2.5 font-semibold leading-relaxed">{children}</p>
    ),
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => (
      <ul className="my-3 list-none space-y-3 pl-0">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-3 list-decimal space-y-3 pl-5 leading-relaxed">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="relative pl-5 leading-relaxed before:absolute before:left-0 before:top-0 before:font-semibold before:text-brand-900 before:content-['—']">
        {children}
      </li>
    ),
    code: ({ children }) => (
      <code className="rounded bg-neutral-200/70 px-1.5 py-0.5 font-mono text-xs">
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
        {linkifyDossierMarkers(m.content, locale, dossierTitles)}
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
        aria-label={ui.openAria}
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
      aria-label={ui.dialogAria}
      className="fixed bottom-0 left-4 right-4 z-[9999] flex max-h-[85vh] flex-col rounded-t-xl border border-neutral-200 bg-neutral-50 shadow-2xl sm:bottom-20 sm:left-4 sm:right-auto sm:h-[560px] sm:max-h-[85vh] sm:w-[380px] sm:rounded-xl"
    >
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{ui.title}</p>
          <p className="text-xs text-neutral-500">{ui.subtitle}</p>
          <p className="mt-0.5 text-xs italic text-neutral-500">
            {DISCLAIMER[locale] ?? DISCLAIMER.fr}
          </p>
        </div>
        <button
          type="button"
          onClick={() => requestClose()}
          aria-label={ui.closeAria}
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
        {messages.length === 0 &&
        paywallState !== 'paywall' &&
        paywallState !== 'choice' &&
        paywallState !== 'email-form' ? (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">{ui.emptyPrompt}</p>
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
          <ul className="flex flex-col gap-5">
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              if (m.role === 'user') {
                return (
                  <li
                    key={i}
                    className="ml-auto max-w-[85%] self-end break-words rounded-2xl bg-brand-900 px-3.5 py-2 text-sm text-neutral-50"
                  >
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  </li>
                );
              }
              const disclaimer =
                RESPONSE_DISCLAIMER[locale] ?? RESPONSE_DISCLAIMER.fr;
              return (
                <li key={i} className="w-full">
                  <div
                    lang={locale}
                    className="break-words text-sm leading-relaxed text-neutral-900 [hyphens:auto]"
                  >
                    {renderAssistantBody(m, isLast)}
                  </div>
                  {m.lastFree && (
                    <p className="mt-2 rounded-md border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs text-neutral-600">
                      {lastFreeBanner}
                    </p>
                  )}
                  {m.complete && !feedback[i] && (
                    <p className="mt-2 text-xs italic text-neutral-500">
                      {disclaimer}
                    </p>
                  )}
                  {m.complete && renderFeedbackBar(i)}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showRating ? (
        <div className="border-t border-neutral-200 bg-neutral-50 p-5">
          {ratingSubmitted ? (
            <p className="text-center text-sm text-neutral-700">
              {(RATING[locale] ?? RATING.fr).thanks}
            </p>
          ) : (
            <>
              <p className="mb-4 text-center text-sm font-semibold text-neutral-900">
                {(RATING[locale] ?? RATING.fr).title}
              </p>
              <div className="mb-3 flex items-center justify-center gap-3">
                {([1, 2, 3] as const).map((value) => {
                  const emoji =
                    value === 1 ? '😞' : value === 2 ? '😐' : '😊';
                  const label = (RATING[locale] ?? RATING.fr).labels[value - 1];
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => submitRating(value)}
                      aria-label={label}
                      title={label}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-2xl transition hover:scale-110 hover:border-brand-900/30 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-900"
                    >
                      <span aria-hidden="true">{emoji}</span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={skipRating}
                className="block w-full text-center text-xs text-neutral-500 hover:text-neutral-900 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-900"
              >
                {(RATING[locale] ?? RATING.fr).skip}
              </button>
            </>
          )}
        </div>
      ) : paywallState === 'choice' ? (
        (() => {
          const cc = CHOICE[locale] ?? CHOICE.fr;
          return (
            <div className="border-t border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm font-semibold text-neutral-900">{cc.title}</p>
              <p className="mt-1 text-xs text-neutral-600">{cc.subtitle}</p>

              <button
                type="button"
                onClick={chooseEmailOption}
                className="mt-4 w-full rounded-md bg-brand-900 px-4 py-2.5 text-sm font-medium text-neutral-50 transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-900 focus:ring-offset-2"
              >
                {cc.optionEmail}
              </button>
              <p className="mt-1 text-center text-xs text-neutral-500">
                {cc.optionEmailHint}
              </p>

              <button
                type="button"
                onClick={onCheckout}
                disabled={checkoutLoading}
                className="mt-3 w-full rounded-md border border-brand-900/30 bg-neutral-50 px-4 py-2.5 text-sm font-medium text-brand-900 transition hover:bg-brand-900/5 focus:outline-none focus:ring-2 focus:ring-brand-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cc.optionPay}
              </button>
              <p className="mt-1 text-center text-xs text-neutral-500">
                {cc.optionPayHint}
              </p>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 block w-full text-center text-xs text-neutral-500 hover:text-neutral-900 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-900"
              >
                {cc.skip}
              </button>
            </div>
          );
        })()
      ) : paywallState === 'email-form' ? (
        (() => {
          const ef = EMAIL_FORM[locale] ?? EMAIL_FORM.fr;

          if (emailSuccessWithOptIn !== null) {
            return (
              <div className="border-t border-neutral-200 bg-neutral-50 p-5">
                <p className="text-center text-sm text-neutral-800">
                  {emailSuccessWithOptIn ? ef.successWithOptIn : ef.success}
                </p>
              </div>
            );
          }

          return (
            <form
              onSubmit={submitEmailGate}
              className="border-t border-neutral-200 bg-neutral-50 p-4"
            >
              <button
                type="button"
                onClick={backToChoice}
                className="mb-2 text-xs text-neutral-500 hover:text-neutral-900 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-900"
                disabled={emailSubmitting}
              >
                {ef.back}
              </button>

              <p className="text-sm font-semibold text-neutral-900">{ef.title}</p>
              <p className="mt-1 text-xs text-neutral-600">{ef.subtitle}</p>

              <label className="mt-3 block">
                <span className="sr-only">{ef.emailPlaceholder}</span>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder={ef.emailPlaceholder}
                  required
                  autoComplete="email"
                  disabled={emailSubmitting}
                  className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              {/* Honeypot — hidden from humans, visible to naive bots. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden"
              >
                <label>
                  Website (leave empty)
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={emailHoneypot}
                    onChange={(e) => setEmailHoneypot(e.target.value)}
                  />
                </label>
              </div>

              <label className="mt-3 flex items-start gap-2 text-xs text-neutral-700">
                <input
                  type="checkbox"
                  checked={emailOptIn}
                  onChange={(e) => setEmailOptIn(e.target.checked)}
                  disabled={emailSubmitting}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-900 focus:ring-brand-900"
                />
                <span>
                  {ef.digestLabel}
                  <span className="mt-0.5 block text-[11px] text-neutral-500">
                    {ef.digestHint}
                  </span>
                </span>
              </label>

              {emailError && (
                <p className="mt-2 text-xs text-status-delayed">
                  {emailError === 'invalid' ? ef.errorInvalid : ef.errorGeneric}
                </p>
              )}

              <button
                type="submit"
                disabled={emailSubmitting || !emailInput.trim()}
                className="mt-3 w-full rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-neutral-50 transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {emailSubmitting ? ef.submitting : ef.submit}
              </button>

              <p className="mt-3 text-[11px] leading-snug text-neutral-500">
                {ef.disclaimer}
              </p>
            </form>
          );
        })()
      ) : paywallState === 'paywall' ? (
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
              placeholder={ui.inputPlaceholder}
              aria-label={ui.inputAria}
              className="max-h-32 min-h-[38px] flex-1 resize-none rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-neutral-50 transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? ui.sending : ui.send}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
