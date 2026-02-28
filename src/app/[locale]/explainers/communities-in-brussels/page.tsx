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
    fr: 'Les Communautés à Bruxelles',
    nl: 'De Gemeenschappen in Brussel',
    en: 'The Communities in Brussels',
    de: 'Die Gemeinschaften in Brüssel',
  };
  const descriptions: Record<string, string> = {
    fr: 'La FWB et la Communauté flamande : leur rôle dans la capitale.',
    nl: 'De FWB en de Vlaamse Gemeenschap: hun rol in de hoofdstad.',
    en: 'The FWB and the Flemish Community: their role in the capital.',
    de: 'Die FWB und die Flämische Gemeinschaft: ihre Rolle in der Hauptstadt.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/explainers/communities-in-brussels' });
}

export default async function CommunitiesInBrusselsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CommunitiesInBrusselsView />;
}

function CommunitiesInBrusselsView() {
  const t = useTranslations('explainers.communitiesInBrussels');
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

          <h2 className="text-lg font-semibold text-neutral-900">{t('fwb.title')}</h2>
          <p>{t('fwb.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('vlGem.title')}</h2>
          <p>{t('vlGem.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('competences.title')}</h2>
          <p>{t('competences.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('whyItMatters.title')}</h2>
          <p>{t('whyItMatters.description')}</p>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <ul className="space-y-2">
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
