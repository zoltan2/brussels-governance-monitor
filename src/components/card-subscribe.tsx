// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { track } from '@/lib/analytics';
import type { TypeDeFiche } from '@/lib/theme-de-fiche';

interface CardSubscribeProps {
  /** Clé de thème, calculée par `cleDeTheme` côté serveur. */
  topic: string;
  type: TypeDeFiche;
  /** Emplacement sur la fiche : recopié dans la source du contact. */
  origine: 'fiche-haut' | 'fiche-bas';
}

export function CardSubscribe({ topic, type, origine }: CardSubscribeProps) {
  const t = useTranslations('cardSubscribe');
  const locale = useLocale();
  const page = usePathname();
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          locale: ['fr', 'nl', 'en', 'de'].includes(locale) ? locale : 'fr',
          topics: [topic],
          origine,
          website, // honeypot
        }),
      });

      if (res.ok) {
        // Réponse 2xx seulement. Jamais l'adresse ni le thème : la page suffit.
        track('inscription-reussie', { page, formulaire: 'fiche' });
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-lg border border-confirmed-border bg-confirmed-bg p-4" role="status" aria-live="polite">
        <p className="text-sm text-confirmed-fg">{t('success')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="mb-3 text-sm font-medium text-neutral-700">{t(`titles.${type}`)}</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        {/* Honeypot field — hidden from users, filled by bots */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor={`card-subscribe-website-${origine}`}>Website</label>
          <input
            id={`card-subscribe-website-${origine}`}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
        <label htmlFor={`card-subscribe-${origine}`} className="sr-only">{t('emailLabel')}</label>
        <input
          type="email"
          id={`card-subscribe-${origine}`}
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          required
          className="min-w-0 flex-1 rounded-md border border-neutral-500 px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        />
        <button
          type="submit"
          disabled={status === 'submitting' || !email.trim()}
          className="shrink-0 rounded-md bg-brand-900 px-4 py-1.5 text-xs font-medium text-neutral-50 transition-colors hover:bg-brand-800 disabled:opacity-50"
        >
          {status === 'submitting' ? t('submitting') : t('submit')}
        </button>
      </form>
      {status === 'error' && (
        <p className="mt-2 text-xs text-status-delayed" role="alert">{t('error')}</p>
      )}
      <p className="mt-2 text-xs text-neutral-500">{t('promise')}</p>
      {/* Information au point de collecte (RGPD art. 13), comme le grand formulaire. */}
      <p className="mt-1 text-xs text-neutral-500">
        {t.rich('privacyNotice', {
          link: (chunks) => (
            <Link href="/privacy" className="underline hover:text-neutral-700">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
