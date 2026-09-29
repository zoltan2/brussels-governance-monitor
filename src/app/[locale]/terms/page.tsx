// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';

/**
 * Conditions de vente de l'accès payant à l'assistant (revue white du
 * 29/09/2026 : l'accès de 90 jours est une vente de service numérique, qui
 * n'avait ni conditions ni information sur la rétractation). Prix TVA comprise
 * confirmé par Zoltán le 29/09. Les chiffres (90 jours, 300 questions par jour)
 * doivent suivre src/app/api/chat/route.ts et src/lib/chat-access.ts
 * (test : terms-page.test.ts).
 */

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    fr: 'Conditions de vente',
    nl: 'Verkoopvoorwaarden',
    en: 'Terms of sale',
    de: 'Verkaufsbedingungen',
  };
  const descriptions: Record<string, string> = {
    fr: "Conditions de vente de l'accès étendu à l'assistant IA du Brussels Governance Monitor : prix, durée, droit de rétractation, réclamations.",
    nl: 'Verkoopvoorwaarden voor uitgebreide toegang tot de AI-assistent van de Brussels Governance Monitor: prijs, duur, herroepingsrecht, klachten.',
    en: 'Terms of sale for extended access to the Brussels Governance Monitor AI assistant: price, duration, right of withdrawal, complaints.',
    de: 'Verkaufsbedingungen für den erweiterten Zugang zum KI-Assistenten des Brussels Governance Monitor: Preis, Dauer, Widerrufsrecht, Beschwerden.',
  };
  return buildMetadata({
    locale,
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    path: '/terms',
  });
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TermsView />;
}

const SECTIONS = ['s1', 's2', 's3', 's4', 's5'] as const;

function TermsView() {
  const t = useTranslations('terms');
  const td = useTranslations('domains');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Link href="/" className="mb-6 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700">
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {td('backToHome')}
        </Link>

        <h1 className="mb-8 text-2xl font-bold text-neutral-900">{t('title')}</h1>

        <div className="space-y-6 text-sm leading-relaxed text-neutral-700">
          <p>{t('intro')}</p>

          {SECTIONS.map((s) => (
            <div key={s} className="space-y-2">
              <h2 className="text-lg font-semibold text-neutral-900">{t(`${s}t`)}</h2>
              <p>{t(s)}</p>
            </div>
          ))}

          <h2 className="text-lg font-semibold text-neutral-900">{t('s6t')}</h2>
          <p>
            {t('s6')}{' '}
            <a href={t('s6url')} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline hover:text-brand-900">
              {t('s6url').replace(/^https:\/\//, '').replace(/\/$/, '')}
            </a>
          </p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('s7t')}</h2>
          <p>
            {t('s7')}{' '}
            <Link href="/privacy" className="text-brand-700 underline hover:text-brand-900">
              {t('s7link')}
            </Link>
          </p>

          <p className="mt-8 text-xs text-neutral-500">{t('lastUpdated', { date: '2026-09-29' })}</p>
        </div>
      </div>
    </section>
  );
}
