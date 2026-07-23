// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { Breadcrumb } from '@/components/breadcrumb';
import { Link } from '@/i18n/navigation';
import { getChangelog, isFilterableSection, resolveCardTitle } from '@/lib/changelog';
import { formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/metadata';
import type { Locale } from '@/i18n/routing';
import type { Metadata } from 'next';
import type { ChangelogEntry } from '@/lib/changelog';
import { SupportCtaChangelog } from '@/components/support-cta';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const titles: Record<string, string> = {
  fr: 'Historique des modifications',
  nl: 'Wijzigingsgeschiedenis',
  en: 'Changelog',
  de: 'Änderungsprotokoll',
};

const descriptions: Record<string, string> = {
  fr: 'Toutes les mises à jour du contenu du Brussels Governance Monitor.',
  nl: 'Alle inhoudsupdates van de Brussels Governance Monitor.',
  en: 'All content updates to the Brussels Governance Monitor.',
  de: 'Alle Inhaltsaktualisierungen des Brussels Governance Monitor.',
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
    path: '/changelog',
  });
}

export default async function ChangelogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ slug?: string; section?: string }>;
}) {
  const { locale } = await params;
  const { slug, section } = await searchParams;
  setRequestLocale(locale);

  const entries = getChangelog(locale as Locale);

  let filtered = false;
  let filteredEntries = entries;
  let filteredTitle: string | null = null;

  if (isFilterableSection(section) && slug) {
    filtered = true;
    filteredEntries = entries.filter((e) => e.targetSlug === slug && e.section === section);
    filteredTitle = resolveCardTitle(section, slug, locale as Locale);
  }

  return (
    <ChangelogView
      entries={filteredEntries}
      locale={locale}
      filtered={filtered}
      filteredTitle={filteredTitle}
    />
  );
}

const typeBadgeClasses: Record<ChangelogEntry['type'], string> = {
  added: 'bg-brand-700/20 text-brand-800',
  updated: 'bg-slate-100 text-slate-700',
  corrected: 'bg-amber-100 text-amber-800',
  removed: 'bg-neutral-200 text-neutral-600',
};

function ChangelogView({
  entries,
  locale,
  filtered,
  filteredTitle,
}: {
  entries: ChangelogEntry[];
  locale: string;
  filtered: boolean;
  filteredTitle: string | null;
}) {
  const t = useTranslations('changelog');
  const tb = useTranslations('breadcrumb');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('changelog') },
        ]} />

        <h1 className="mb-2 text-2xl font-bold text-neutral-900">{t('pageTitle')}</h1>
        <p className="mb-8 text-sm text-neutral-500">{t('pageSubtitle')}</p>

        {filtered && (
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
            <span>{t('filteredFor', { title: filteredTitle || t('genericCard') })}</span>
            <Link href="/changelog" className="font-medium text-brand-700 hover:underline">
              {t('viewAll')}
            </Link>
          </div>
        )}

        <SupportCtaChangelog />

        {filtered && entries.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('noEntriesForCard')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">{t('pageTitle')}</caption>
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th scope="col" className="pb-2 pr-4 font-medium">{t('date')}</th>
                  <th scope="col" className="pb-2 pr-4 font-medium">{t('type')}</th>
                  <th scope="col" className="pb-2 pr-4 font-medium">{t('section')}</th>
                  <th scope="col" className="pb-2 font-medium">{t('description')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {entries.map((entry, i) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-4 align-top whitespace-nowrap text-neutral-500">
                      <time dateTime={entry.date}>{formatDate(entry.date, locale)}</time>
                    </td>
                    <td className="py-2.5 pr-4 align-top">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${typeBadgeClasses[entry.type]}`}
                      >
                        {t(`types.${entry.type}`)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 align-top whitespace-nowrap text-neutral-500">
                      {t(`sections.${entry.section}`)}
                    </td>
                    <td className="py-2.5 align-top text-neutral-700">{entry.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
