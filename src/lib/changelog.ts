// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { z } from 'zod';
import type { Locale } from '@/i18n/routing';
import {
  getDomainCard,
  getSectorCard,
  getCommuneCard,
  getDossierCard,
  getSolutionCard,
  getComparisonCard,
} from '@/lib/content';
import changelogData from '../../data/changelog.json';

const changelogEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['added', 'updated', 'corrected', 'removed']),
  section: z.enum([
    'domains',
    'dossiers',
    'solutions',
    'sectors',
    'comparisons',
    'communes',
    'timeline',
    'glossary',
    'site',
  ]),
  targetSlug: z.string().nullable(),
  descriptions: z.object({
    fr: z.string(),
    nl: z.string(),
    en: z.string(),
    de: z.string(),
  }),
  summaries: z.object({
    fr: z.string(),
    nl: z.string(),
    en: z.string(),
    de: z.string(),
  }).optional(),
  /** Heading text per locale to scroll to on the target page (used to build #anchor fragment) */
  anchor: z.object({
    fr: z.string(),
    nl: z.string(),
    en: z.string(),
    de: z.string(),
  }).optional(),
});

const changelogSchema = z.array(changelogEntrySchema);

export interface ChangelogEntry {
  date: string;
  type: 'added' | 'updated' | 'corrected' | 'removed';
  section: 'domains' | 'dossiers' | 'solutions' | 'sectors' | 'comparisons' | 'communes' | 'timeline' | 'glossary' | 'site';
  targetSlug: string | null;
  description: string;
  summary?: string;
  anchor?: string;
}

export function getChangelog(locale: Locale): ChangelogEntry[] {
  const parsed = changelogSchema.parse(changelogData);
  return parsed.map((entry) => ({
    date: entry.date,
    type: entry.type,
    section: entry.section,
    targetSlug: entry.targetSlug,
    description: entry.descriptions[locale] || entry.descriptions.fr,
    summary: entry.summaries?.[locale] || entry.summaries?.fr,
    anchor: entry.anchor?.[locale] || entry.anchor?.fr,
  }));
}

export function getRecentChanges(locale: Locale, limit = 5): ChangelogEntry[] {
  return getChangelog(locale).slice(0, limit);
}

export interface LatestUpdate {
  date: string;
  type: 'added' | 'updated' | 'corrected' | 'removed';
  section: string;
  targetSlug: string | null;
  description: string;
  summary?: string;
  anchor?: string;
  href: string | null;
}

const SECTION_ROUTES: Record<string, string> = {
  domains: '/domains',
  dossiers: '/dossiers',
  sectors: '/sectors',
  communes: '/communes',
  comparisons: '/comparisons',
  solutions: '/solutions',
  glossary: '/glossary',
};

export function getLatestUpdate(locale: Locale): LatestUpdate {
  const entries = getChangelog(locale);
  const entry = entries[0];
  const base = SECTION_ROUTES[entry.section];
  const href = base && entry.targetSlug ? `${base}/${entry.targetSlug}` : null;
  return { ...entry, href };
}

export const FILTERABLE_SECTIONS = [
  'domains',
  'sectors',
  'communes',
  'dossiers',
  'solutions',
  'comparisons',
] as const;

export type FilterableSection = (typeof FILTERABLE_SECTIONS)[number];

export function isFilterableSection(value: string | undefined): value is FilterableSection {
  return !!value && (FILTERABLE_SECTIONS as readonly string[]).includes(value);
}

/**
 * Resolve a card's title for the filtered changelog view. Returns null if the
 * slug doesn't exist in the given section's collection (renamed/removed card).
 * Deliberately independent from changelog entry filtering: a removed card
 * (`changeType: 'removed'`) can have legitimate historical entries with no
 * matching Velite card — callers must keep showing those entries and fall
 * back to a generic title, not hide the entries because the card is gone.
 */
export function resolveCardTitle(
  section: FilterableSection,
  slug: string,
  locale: Locale,
): string | null {
  switch (section) {
    case 'domains':
      return getDomainCard(slug, locale)?.card.title ?? null;
    case 'sectors':
      return getSectorCard(slug, locale)?.card.title ?? null;
    case 'communes':
      return getCommuneCard(slug, locale)?.card.title ?? null;
    case 'dossiers':
      return getDossierCard(slug, locale)?.card.title ?? null;
    case 'solutions':
      return getSolutionCard(slug, locale)?.card.title ?? null;
    case 'comparisons':
      return getComparisonCard(slug, locale)?.card.title ?? null;
  }
}
