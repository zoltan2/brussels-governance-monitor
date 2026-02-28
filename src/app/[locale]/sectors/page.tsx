// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { getSectorCards } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';
import { Link } from '@/i18n/navigation';
import { Breadcrumb } from '@/components/breadcrumb';
import { routing, type Locale } from '@/i18n/routing';
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
  const titles: Record<string, string> = { fr: 'Secteurs impactés', nl: 'Getroffen sectoren', en: 'Impacted sectors', de: 'Betroffene Sektoren' };
  const descriptions: Record<string, string> = {
    fr: 'Les secteurs clés de l\'économie bruxelloise, suivis et documentés.',
    nl: 'De belangrijkste sectoren van de Brusselse economie, gevolgd en gedocumenteerd.',
    en: 'Key sectors of the Brussels economy, tracked and documented.',
    de: 'Die wichtigsten Sektoren der Brüsseler Wirtschaft, verfolgt und dokumentiert.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/sectors' });
}

export default async function SectorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sectorCards = getSectorCards(locale as Locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <SectorsContent sectorCards={sectorCards} />
    </div>
  );
}

function SectorsContent({
  sectorCards,
}: {
  sectorCards: ReturnType<typeof getSectorCards>;
}) {
  const t = useTranslations('sectors');
  const tb = useTranslations('breadcrumb');

  return (
    <>
      <Breadcrumb items={[
        { label: tb('home'), href: '/' },
        { label: tb('sectors') },
      ]} />
      <h1 className="mb-2 text-2xl font-bold text-neutral-900">{t('title')}</h1>
      <p className="mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

      <div className="grid gap-6 md:grid-cols-2">
        {sectorCards.map((card) => (
          <Link
            key={card.slug}
            href={{ pathname: '/sectors/[slug]', params: { slug: card.slug } }}
            className="rounded-lg border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
          >
            <h2 className="mb-2 text-base font-semibold text-neutral-900">{card.title}</h2>
            {card.humanImpact && (
              <p className="mb-3 text-sm text-neutral-600">{card.humanImpact}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span>
                {card.frozenMechanisms.length} {t('frozenMechanisms').toLowerCase()}
              </span>
              <span>
                {card.activeMechanisms.length} {t('activeMechanisms').toLowerCase()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
