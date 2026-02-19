import { z } from 'zod';
import type { Locale } from '@/i18n/routing';
import radarData from '../../data/radar.json';
import sourceRegistry from '../../docs/source-registry.json';

// ---------- Schema ----------

const i18nString = z.object({
  fr: z.string(),
  nl: z.string(),
  en: z.string(),
  de: z.string(),
});

const radarEntrySchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confidence: z.enum(['official', 'estimated', 'unconfirmed']),
  status: z.enum(['active', 'confirmed', 'archived']),
  cards: z.array(z.string()).min(1),
  source: z.object({
    label: z.string(),
    url: z.string().url(),
    accessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  nextStep: i18nString.optional(),
  descriptions: i18nString,
  promotedTo: z.string().nullable(),
  archivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  period: z.string().optional(),
});

const radarSchema = z.object({
  lastVeille: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z.array(radarEntrySchema),
});

// ---------- Types ----------

export type RadarEntry = z.infer<typeof radarEntrySchema>;

export interface LocalizedRadarEntry {
  id: string;
  date: string;
  confidence: 'official' | 'estimated' | 'unconfirmed';
  status: 'active' | 'confirmed' | 'archived';
  cards: string[];
  source: { label: string; url: string; accessedAt: string };
  nextStep?: string;
  description: string;
  promotedTo: string | null;
  archivedAt: string | null;
  period?: string;
}

// ---------- Parsed data ----------

const parsed = radarSchema.parse(radarData);

// ---------- Helpers ----------

function localize(entry: RadarEntry, locale: Locale): LocalizedRadarEntry {
  return {
    id: entry.id,
    date: entry.date,
    confidence: entry.confidence,
    status: entry.status,
    cards: entry.cards,
    source: entry.source,
    nextStep: entry.nextStep?.[locale] || entry.nextStep?.fr,
    description: entry.descriptions[locale] || entry.descriptions.fr,
    promotedTo: entry.promotedTo,
    archivedAt: entry.archivedAt,
    period: entry.period,
  };
}

export function getLastVeille(): string {
  return parsed.lastVeille;
}

export function getVeilleSourceCount(): number {
  return (sourceRegistry as { stats: { total: number } }).stats.total;
}

export function getActiveSignals(locale: Locale, limit?: number): LocalizedRadarEntry[] {
  const active = parsed.entries
    .filter((e) => e.status === 'active')
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => localize(e, locale));
  return limit ? active.slice(0, limit) : active;
}

export function getConfirmedSignals(locale: Locale): LocalizedRadarEntry[] {
  return parsed.entries
    .filter((e) => e.status === 'confirmed')
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => localize(e, locale));
}

export function getArchivedSignals(locale: Locale): LocalizedRadarEntry[] {
  return parsed.entries
    .filter((e) => e.status === 'archived')
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => localize(e, locale));
}

export function getSignalsForCard(cardSlug: string, locale: Locale): LocalizedRadarEntry[] {
  return parsed.entries
    .filter((e) => e.cards.includes(cardSlug) && e.status !== 'archived')
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => localize(e, locale));
}

export function getAllSignals(locale: Locale): LocalizedRadarEntry[] {
  return parsed.entries
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => localize(e, locale));
}
