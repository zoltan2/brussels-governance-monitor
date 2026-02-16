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
});

const changelogSchema = z.array(changelogEntrySchema);

export interface ChangelogEntry {
  date: string;
  type: 'added' | 'updated' | 'corrected' | 'removed';
  section: 'domains' | 'dossiers' | 'solutions' | 'sectors' | 'comparisons' | 'communes' | 'timeline' | 'glossary' | 'site';
  targetSlug: string | null;
  description: string;
}

export function getChangelog(locale: Locale): ChangelogEntry[] {
  const parsed = changelogSchema.parse(changelogData);
  return parsed.map((entry) => ({
    date: entry.date,
    type: entry.type,
    section: entry.section,
    targetSlug: entry.targetSlug,
    description: entry.descriptions[locale] || entry.descriptions.fr,
  }));
}

export function getRecentChanges(locale: Locale, limit = 5): ChangelogEntry[] {
  return getChangelog(locale).slice(0, limit);
}
