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
    fr: 'Le Fédéral et Bruxelles',
    nl: 'De federale overheid en Brussel',
    en: 'The Federal State and Brussels',
    de: 'Der Föderalstaat und Brüssel',
  };
  const descriptions: Record<string, string> = {
    fr: 'La présence et l\'impact de l\'État fédéral dans la capitale.',
    nl: 'De aanwezigheid en impact van de federale staat in de hoofdstad.',
    en: 'The presence and impact of the federal state in the capital.',
    de: 'Die Präsenz und der Einfluss des Föderalstaats in der Hauptstadt.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/explainers/federal-and-brussels' });
}

export default async function FederalAndBrusselsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <FederalAndBrusselsView />;
}

function FederalAndBrusselsView() {
  const t = useTranslations('explainers.federalAndBrussels');
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

          <h2 className="text-lg font-semibold text-neutral-900">{t('competences.title')}</h2>
          <p>{t('competences.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('beliris.title')}</h2>
          <p>{t('beliris.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('justice.title')}</h2>
          <p>{t('justice.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('security.title')}</h2>
          <p>{t('security.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('fiscal.title')}</h2>
          <p>{t('fiscal.description')}</p>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <ul className="space-y-2">
              <li>
                <Link href="/explainers/brussels-region" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkRegion')}
                </Link>
              </li>
              <li>
                <Link href="/explainers/levels-of-power" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkLevels')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
