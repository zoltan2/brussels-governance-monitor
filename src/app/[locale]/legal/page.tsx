// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = { fr: 'Mentions légales', nl: 'Juridische vermeldingen', en: 'Legal notice', de: 'Impressum' };
  const descriptions: Record<string, string> = {
    fr: 'Informations légales et conditions d\'utilisation du Brussels Governance Monitor.',
    nl: 'Juridische informatie en gebruiksvoorwaarden van de Brussels Governance Monitor.',
    en: 'Legal information and terms of use of the Brussels Governance Monitor.',
    de: 'Rechtliche Informationen und Nutzungsbedingungen des Brussels Governance Monitor.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/legal' });
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalView />;
}

function LegalView() {
  const t = useTranslations('legal');
  const td = useTranslations('domains');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Link
          href="/"
          className="mb-6 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {td('backToHome')}
        </Link>

        <h1 className="mb-8 text-2xl font-bold text-neutral-900">{t('title')}</h1>

        <div className="space-y-6 text-sm leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900">{t('publisher.title')}</h2>
          <p>{t('publisher.description')}</p>
          <p>{t('publisher.address')}</p>
          <p className="text-xs text-neutral-500">{t('publisher.bce')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('hosting.title')}</h2>
          <p>{t('hosting.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('intellectual.title')}</h2>
          <p>{t('intellectual.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('liability.title')}</h2>
          <p>{t('liability.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('links.title')}</h2>
          <p>{t('links.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('contact.title')}</h2>
          <p>{t('contact.description')}</p>

          <p className="mt-8 text-xs text-neutral-500">
            {t('lastUpdated', { date: '2026-02-11' })}
          </p>
        </div>
      </div>
    </section>
  );
}
