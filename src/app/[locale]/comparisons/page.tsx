// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { getComparisonCards } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';
import { routing, type Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Breadcrumb } from '@/components/breadcrumb';
import { formatDate } from '@/lib/utils';
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
  const titles: Record<string, string> = { fr: 'Comparaisons', nl: 'Vergelijkingen', en: 'Comparisons', de: 'Vergleiche' };
  const descriptions: Record<string, string> = {
    fr: 'Bruxelles comparée aux autres capitales et régions européennes : données Eurostat.',
    nl: 'Brussel vergeleken met andere Europese hoofdsteden en regio\'s: Eurostat-gegevens.',
    en: 'Brussels compared to other European capitals and regions: Eurostat data.',
    de: 'Brüssel im Vergleich mit anderen europäischen Hauptstädten und Regionen: Eurostat-Daten.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/comparisons' });
}

export default async function ComparisonsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cards = getComparisonCards(locale as Locale);

  return <ComparisonsList cards={cards} locale={locale} />;
}

function ComparisonsList({
  cards,
  locale,
}: {
  cards: ReturnType<typeof getComparisonCards>;
  locale: string;
}) {
  const t = useTranslations('comparisons');
  const tb = useTranslations('breadcrumb');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('comparisons') },
        ]} />
        <h1 className="mb-2 text-3xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mb-8 text-base text-neutral-600">{t('subtitle')}</p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.slug}
              href={{ pathname: '/comparisons/[slug]', params: { slug: card.slug } }}
              className="group rounded-lg border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex flex-wrap gap-1.5">
                {card.entities.map((e) => (
                  <span
                    key={e.code}
                    className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600"
                  >
                    {e.code}
                  </span>
                ))}
              </div>
              <h2 className="mb-2 text-lg font-semibold text-neutral-900 group-hover:text-brand-700">
                {card.title}
              </h2>
              <p className="mb-3 text-sm text-neutral-600">{card.indicator}</p>
              <p className="text-xs text-neutral-500">
                {formatDate(card.lastModified, locale)}
              </p>
            </Link>
          ))}
        </div>

        {cards.length === 0 && (
          <p className="text-center text-neutral-500">{t('noData')}</p>
        )}
      </div>
    </section>
  );
}
