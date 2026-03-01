// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Link } from '@/i18n/navigation';
import { Breadcrumb } from '@/components/breadcrumb';
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
  const titles: Record<string, string> = {
    fr: 'La COCOM : Commission communautaire commune',
    nl: 'De GGC: Gemeenschappelijke Gemeenschapscommissie',
    en: 'COCOM: the Common Community Commission',
    de: 'Die GGK: Gemeinsame Gemeinschaftskommission',
  };
  const descriptions: Record<string, string> = {
    fr: 'L\'institution bicommunautaire qui gère la santé et l\'aide sociale à Bruxelles.',
    nl: 'De bicommunautaire instelling die gezondheid en sociale hulp in Brussel beheert.',
    en: 'The bicommunal institution managing health and social welfare in Brussels.',
    de: 'Die bikommunale Institution für Gesundheit und Sozialhilfe in Brüssel.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/explainers/cocom' });
}

export default async function CocomPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CocomView />;
}

function CocomView() {
  const t = useTranslations('explainers.cocom');
  const tb = useTranslations('breadcrumb');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('understand'), href: '/understand' },
          { label: t('title') },
        ]} />

        <h1 className="mb-4 text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-700">
          <p>{t('intro')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('whyItMatters.title')}</h2>
          <p>{t('whyItMatters.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('governance.title')}</h2>
          <p>{t('governance.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('iriscare.title')}</h2>
          <p>{t('iriscare.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('competences.title')}</h2>
          <p>{t('competences.description')}</p>

          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('crisisImpact.title')}</h2>
            <p>{t('crisisImpact.description')}</p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <ul className="space-y-2">
              <li>
                <Link href="/explainers/brussels-region" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkRegion')}
                </Link>
              </li>
              <li>
                <Link href="/explainers/cocof" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkCocof')}
                </Link>
              </li>
              <li>
                <Link href="/explainers/vgc" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkVgc')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
