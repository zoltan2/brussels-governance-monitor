import { z } from 'zod';
import type { Locale } from '@/i18n/routing';
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
});

const changelogSchema = z.array(changelogEntrySchema);

export interface ChangelogEntry {
  date: string;
  type: 'added' | 'updated' | 'corrected' | 'removed';
  section: 'domains' | 'dossiers' | 'solutions' | 'sectors' | 'comparisons' | 'communes' | 'timeline' | 'glossary' | 'site';
  targetSlug: string | null;
  description: string;
  summary?: string;
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
