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
  const titles: Record<string, string> = { fr: 'Politique de confidentialité', nl: 'Privacybeleid', en: 'Privacy Policy', de: 'Datenschutzrichtlinie' };
  const descriptions: Record<string, string> = {
    fr: 'Comment nous protégeons vos données personnelles sur le Brussels Governance Monitor.',
    nl: 'Hoe wij uw persoonlijke gegevens beschermen op de Brussels Governance Monitor.',
    en: 'How we protect your personal data on the Brussels Governance Monitor.',
    de: 'Wie wir Ihre persönlichen Daten auf dem Brussels Governance Monitor schützen.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/privacy' });
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PrivacyView />;
}

function PrivacyView() {
  const t = useTranslations('privacy');
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
          <h2 className="text-lg font-semibold text-neutral-900">{t('controller.title')}</h2>
          <p>{t('controller.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('dataCollected.title')}</h2>
          <p>{t('dataCollected.description')}</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>{t('dataCollected.email')}</li>
            <li>{t('dataCollected.topics')}</li>
            <li>{t('dataCollected.locale')}</li>
          </ul>

          <h2 className="text-lg font-semibold text-neutral-900">{t('basis.title')}</h2>
          <p>{t('basis.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('retention.title')}</h2>
          <p>{t('retention.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('rights.title')}</h2>
          <p>{t('rights.description')}</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>{t('rights.access')}</li>
            <li>{t('rights.rectification')}</li>
            <li>{t('rights.deletion')}</li>
            <li>{t('rights.portability')}</li>
            <li>{t('rights.opposition')}</li>
            <li>{t('rights.limitation')}</li>
            <li>{t('rights.withdraw')}</li>
          </ul>
          <p className="text-xs text-neutral-500">{t('rights.complaint')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('thirdParties.title')}</h2>
          <p>{t('thirdParties.description')}</p>
          <ul className="ml-4 list-disc space-y-2">
            <li>{t('thirdParties.vercel')}</li>
            <li>{t('thirdParties.umami')}</li>
            <li>{t('thirdParties.resend')}</li>
            <li>{t('thirdParties.appsignal')}</li>
          </ul>
          <p className="text-xs text-neutral-500">{t('thirdParties.legalBasis')}</p>
          <p className="text-xs text-neutral-500">{t('thirdParties.transfers')}</p>
          <p className="text-xs text-neutral-500">{t('thirdParties.statusPage')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('cookies.title')}</h2>
          <p>{t('cookies.description')}</p>

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
