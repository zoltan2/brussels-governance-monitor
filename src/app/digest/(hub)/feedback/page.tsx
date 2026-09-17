// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
// Le type global de window.umami et la garde vivent désormais dans lib/analytics.
// Celui qui était déclaré ici typait les données en Record<string, string>, plus
// étroit que l'API réelle : c'est ce qui obligeait le quiz à recaster window pour
// envoyer des nombres, et donc à recopier sa propre garde.
import { track } from '@/lib/analytics';

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
    track(`digest-feedback-${vote}`);
  }, [week, vote]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-900/5">
          <span className="text-3xl">{vote === 'yes' ? '👍' : '👎'}</span>
        </div>
        <h1 className="mb-3 text-xl font-bold text-neutral-900">{t.title}</h1>
        <p className="mb-8 text-neutral-500">{t.subtitle}</p>
        <a
          href={`https://governance.brussels/${lang}`}
          className="text-sm font-medium text-brand-700 hover:text-brand-900"
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
          <p className="text-neutral-500">...</p>
        </div>
      }
    >
      <FeedbackContent />
    </Suspense>
  );
}
