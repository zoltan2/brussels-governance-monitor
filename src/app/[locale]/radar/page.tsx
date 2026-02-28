// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing, type Locale } from '@/i18n/routing';
import { getActiveSignals, getConfirmedSignals, getArchivedSignals } from '@/lib/radar';
import { Breadcrumb } from '@/components/breadcrumb';
import { buildMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';
import type { LocalizedRadarEntry } from '@/lib/radar';
import { RadarContent } from './radar-content';

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
    fr: 'Radar',
    nl: 'Radar',
    en: 'Radar',
    de: 'Radar',
  };
  const descriptions: Record<string, string> = {
    fr: 'Signaux en cours de vérification par le Brussels Governance Monitor.',
    nl: 'Signalen in verificatie door de Brussels Governance Monitor.',
    en: 'Signals under verification by the Brussels Governance Monitor.',
    de: 'Signale in Überprüfung durch den Brussels Governance Monitor.',
  };
  return buildMetadata({
    locale,
    title: titles[locale] || titles.fr,
    description: descriptions[locale] || descriptions.fr,
    path: '/radar',
  });
}

export interface RadarLabels {
  title: string;
  subtitle: string;
  shieldText: string;
  homepageTitle: string;
  confirmedSection: string;
  archiveSection: string;
  noActiveSignals: string;
  source: string;
  nextStep: string;
  seeCard: string;
  loadMore: string;
  confidence: Record<string, string>;
  status: Record<string, string>;
}

function RadarPageContent({
  active,
  confirmed,
  archived,
  locale,
}: {
  active: LocalizedRadarEntry[];
  confirmed: LocalizedRadarEntry[];
  archived: LocalizedRadarEntry[];
  locale: string;
}) {
  const t = useTranslations('radar');
  const tb = useTranslations('breadcrumb');

  const labels: RadarLabels = {
    title: t('title'),
    subtitle: t('subtitle'),
    shieldText: t('shieldText'),
    homepageTitle: t('homepageTitle'),
    confirmedSection: t('confirmedSection'),
    archiveSection: t('archiveSection'),
    noActiveSignals: t('noActiveSignals'),
    source: t('source'),
    nextStep: t('nextStep'),
    seeCard: t('seeCard'),
    loadMore: t('loadMore'),
    confidence: {
      official: t('confidence.official'),
      estimated: t('confidence.estimated'),
      unconfirmed: t('confidence.unconfirmed'),
    },
    status: {
      active: t('status.active'),
      confirmed: t('status.confirmed'),
      archived: t('status.archived'),
    },
  };

  return (
    <>
      <Breadcrumb items={[
        { label: tb('home'), href: '/' },
        { label: tb('radar') },
      ]} />
      <RadarContent
        active={active}
        confirmed={confirmed}
        archived={archived}
        locale={locale}
        labels={labels}
      />
    </>
  );
}

export default async function RadarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const active = getActiveSignals(locale as Locale);
  const confirmed = getConfirmedSignals(locale as Locale);
  const archived = getArchivedSignals(locale as Locale);

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <RadarPageContent
          active={active}
          confirmed={confirmed}
          archived={archived}
          locale={locale}
        />
      </div>
    </section>
  );
}
