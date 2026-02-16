'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, string>) => void;
    };
  }
}

const messages: Record<string, { title: string; subtitle: string; back: string }> = {
  fr: {
    title: 'Merci pour votre retour !',
    subtitle: 'Votre avis nous aide à améliorer le digest chaque semaine.',
    back: 'Retour au site →',
  },
  nl: {
    title: 'Bedankt voor uw feedback!',
    subtitle: 'Uw mening helpt ons de digest elke week te verbeteren.',
    back: 'Terug naar de site →',
  },
  en: {
    title: 'Thanks for your feedback!',
    subtitle: 'Your input helps us improve the digest every week.',
    back: 'Back to the site →',
  },
  de: {
    title: 'Danke für Ihr Feedback!',
    subtitle: 'Ihre Meinung hilft uns, den Digest jede Woche zu verbessern.',
    back: 'Zurück zur Seite →',
  },
};

function FeedbackContent() {
  const searchParams = useSearchParams();
  const tracked = useRef(false);

  const week = searchParams.get('week') || '';
  const vote = searchParams.get('vote') || '';
  const lang = searchParams.get('lang') || 'fr';
  const t = messages[lang] || messages.fr;

  useEffect(() => {
    if (tracked.current || !week || !vote) return;
    tracked.current = true;
    window.umami?.track(`digest-feedback-${vote}`);
  }, [week, vote]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <span className="text-3xl">{vote === 'yes' ? '👍' : '👎'}</span>
        </div>
        <h1 className="mb-3 text-xl font-bold text-neutral-900">{t.title}</h1>
        <p className="mb-8 text-neutral-500">{t.subtitle}</p>
        <a
          href={`https://governance.brussels/${lang}`}
          className="text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          {t.back}
        </a>
      </div>
    </div>
  );
}

export default function DigestFeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-16">
          <p className="text-neutral-400">...</p>
        </div>
      }
    >
      <FeedbackContent />
    </Suspense>
  );
}
