// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { getCommuneCards } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';
import { Breadcrumb } from '@/components/breadcrumb';
import { CommuneCard } from '@/components/commune-card';
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
  const titles: Record<string, string> = {
    fr: 'Les 19 communes',
    nl: 'De 19 gemeenten',
    en: 'The 19 municipalities',
    de: 'Die 19 Gemeinden',
  };
  const descriptions: Record<string, string> = {
    fr: 'Monitoring de la transparence et de la gouvernance communale à Bruxelles.',
    nl: 'Monitoring van transparantie en gemeentelijk bestuur in Brussel.',
    en: 'Monitoring transparency and municipal governance in Brussels.',
    de: 'Monitoring der Transparenz und Gemeindeverwaltung in Brüssel.',
  };
  return buildMetadata({
    locale,
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    path: '/communes',
  });
}

export default async function CommunesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const communeCards = getCommuneCards(locale as Locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <CommunesContent communeCards={communeCards} />
    </div>
  );
}

function CommunesContent({
  communeCards,
}: {
  communeCards: ReturnType<typeof getCommuneCards>;
}) {
  const t = useTranslations('communes');
  const tb = useTranslations('breadcrumb');

  return (
    <>
      <Breadcrumb
        items={[
          { label: tb('home'), href: '/' },
          { label: tb('communes') },
        ]}
      />
      <h1 className="mb-2 text-2xl font-bold text-neutral-900">{t('title')}</h1>
      <p className="mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

      {communeCards.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucune commune disponible.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {communeCards.map((card) => (
            <CommuneCard key={card.slug} card={card} />
          ))}
        </div>
      )}
    </>
  );
}
