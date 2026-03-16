// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { Breadcrumb } from '@/components/breadcrumb';
import { buildMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const titles: Record<string, string> = {
  fr: 'Soutenir le projet',
  nl: 'Het project steunen',
  en: 'Support the project',
  de: 'Das Projekt unterstützen',
};

const descriptions: Record<string, string> = {
  fr: 'Soutenez le Brussels Governance Monitor — un projet citoyen indépendant, sans publicité et sans subvention.',
  nl: 'Steun de Brussels Governance Monitor — een onafhankelijk burgerproject, zonder reclame en zonder subsidie.',
  en: 'Support the Brussels Governance Monitor — an independent citizen project, ad-free and without subsidies.',
  de: 'Unterstützen Sie den Brussels Governance Monitor — ein unabhängiges Bürgerprojekt, werbefrei und ohne Subventionen.',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale,
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    path: '/support',
  });
}

const DONATE_ONCE_URL = 'https://donate.stripe.com/3cI6oG72qdqma76dWe3wQ01';
const DONATE_MONTHLY_URL = 'https://donate.stripe.com/8x2fZg86ubie932aK23wQ02';

const stripeLocaleMap: Record<string, string> = {
  fr: 'fr',
  nl: 'nl',
  en: 'en',
  de: 'de',
};

function getDonateOnceUrl(locale: string): string {
  const stripeLocale = stripeLocaleMap[locale] || 'fr';
  return `${DONATE_ONCE_URL}?locale=${stripeLocale}`;
}

function getDonateMonthlyUrl(locale: string, amountCents?: number): string {
  const stripeLocale = stripeLocaleMap[locale] || 'fr';
  const params = new URLSearchParams({ locale: stripeLocale });
  if (amountCents) params.set('prefilled_amount', String(amountCents));
  return `${DONATE_MONTHLY_URL}?${params.toString()}`;
}

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <SupportView
      locale={locale}
      donateOnceUrl={getDonateOnceUrl(locale)}
      donateMonthlyUrl={(cents?: number) => getDonateMonthlyUrl(locale, cents)}
    />
  );
}

function SupportView({
  locale,
  donateOnceUrl,
  donateMonthlyUrl,
}: {
  locale: string;
  donateOnceUrl: string;
  donateMonthlyUrl: (cents?: number) => string;
}) {
  const t = useTranslations('support');
  const tb = useTranslations('breadcrumb');

  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Breadcrumb
          items={[
            { label: tb('home'), href: '/' },
            { label: tb('support') },
          ]}
        />

        {/* Section 1: Hero */}
        <h1 className="mb-2 text-2xl font-bold text-neutral-900">
          {t('pageTitle')}
        </h1>
        <p className="mb-6 text-sm text-neutral-500">{t('pageSubtitle')}</p>
        <p className="mb-10 text-sm leading-relaxed text-neutral-600">
          {t('intro')}
        </p>

        {/* Section 2: What it funds */}
        <div className="mb-10 rounded-lg bg-neutral-50 p-6">
          <h2 className="mb-5 text-center text-sm font-semibold text-neutral-700">
            {t('whatItFunds')}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <svg className="h-7 w-7 text-blue-800" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7" /></svg>
              <span className="text-xs font-medium text-neutral-700">{t('pillarHosting')}</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <svg className="h-7 w-7 text-blue-800" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              <span className="text-xs font-medium text-neutral-700">{t('pillarVeille')}</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <svg className="h-7 w-7 text-blue-800" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>
              <span className="text-xs font-medium text-neutral-700">{t('pillarLanguages')}</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <svg className="h-7 w-7 text-blue-800" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
              <span className="text-xs font-medium text-neutral-700">{t('pillarIndependence')}</span>
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] text-neutral-400">
            {t('languagesNote')}
          </p>
        </div>

        {/* Section 3: Donate */}
        <div className="mb-10 grid gap-5 sm:grid-cols-2">
          {/* One-time */}
          <div className="rounded-lg border border-neutral-200 bg-white p-5 text-center">
            <h3 className="mb-1 text-sm font-semibold text-neutral-800">{t('onceTitle')}</h3>
            <p className="mb-4 text-xs text-neutral-500">{t('onceSubtitle')}</p>
            <a
              href={donateOnceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-800 hover:shadow-md"
            >
              {t('donateButton')}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
            </a>
          </div>

          {/* Monthly */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-5 text-center">
            <h3 className="mb-1 text-sm font-semibold text-neutral-800">{t('monthlyTitle')}</h3>
            <p className="mb-4 text-xs text-neutral-500">{t('monthlySubtitle')}</p>
            <div className="mb-3 flex justify-center gap-2">
              {[500, 1000, 2000].map((cents) => (
                <a
                  key={cents}
                  href={donateMonthlyUrl(cents)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-blue-800 px-4 py-2 text-xs font-medium text-blue-800 transition-colors hover:bg-blue-800 hover:text-white"
                >
                  {cents / 100} €/{t('month')}
                </a>
              ))}
            </div>
          </div>
        </div>
        <p className="mb-10 text-center text-xs text-neutral-400">
          Visa · Mastercard · Bancontact · Apple Pay · Google Pay
        </p>

        {/* Section 4: Stats */}
        <div className="mb-10 flex flex-wrap justify-center gap-6 text-center text-xs text-neutral-500">
          <span><strong className="text-neutral-700">528</strong> {t('statPages')}</span>
          <span><strong className="text-neutral-700">323</strong> {t('statSources')}</span>
          <span><strong className="text-neutral-700">13</strong> {t('statDomains')}</span>
          <span><strong className="text-neutral-700">19</strong> {t('statCommunes')}</span>
        </div>

        {/* Section 5: Legal */}
        <div className="mb-10 rounded-lg bg-neutral-50 p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {t('transparencyTitle')}
          </h2>
          <p className="text-xs leading-relaxed text-neutral-600">
            {t('legalText')}
          </p>
        </div>

        {/* Section 6: Other ways */}
        <div>
          <h2 className="mb-4 text-sm font-semibold text-neutral-700">
            {t('otherWaysTitle')}
          </h2>
          <ul className="space-y-2 text-xs text-neutral-600">
            <li>
              <strong className="text-neutral-700">{t('shareLabel')}</strong>
              {' — '}
              {t('shareText')}
            </li>
            <li>
              <strong className="text-neutral-700">{t('reportLabel')}</strong>
              {' — '}
              {t('reportText')}
            </li>
            <li>
              <strong className="text-neutral-700">{t('contributeLabel')}</strong>
              {' — '}
              <a
                href="https://github.com/zoltan2/brussels-governance-monitor"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-800 hover:underline"
              >
                GitHub
                <span className="ml-0.5 text-neutral-400" aria-hidden="true">&#8599;</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
