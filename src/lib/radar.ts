// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { z } from 'zod';
import type { Locale } from '@/i18n/routing';
import radarData from '../../data/radar.json';
import sourceRegistry from '../../docs/source-registry.json';
import {
  getAllDomainSlugs,
  getAllDossierSlugs,
  getAllCommuneSlugs,
  getAllSectorSlugs,
} from './content';

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
    url: z.string().url().nullable(),
    accessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  nextStep: i18nString.optional(),
  // `summary` is the short blurb (~150 chars/locale) rendered on the homepage
  // under "Signaux en cours de vérification". `descriptions` is the long form
  // (unbounded) shown on /radar and card detail pages. Homepage falls back to
  // the first sentence of `descriptions` when `summary` is absent — see
  // getHomepageBlurb() in src/app/[locale]/page.tsx.
  summary: i18nString.optional(),
  descriptions: i18nString,
  promotedTo: z.string().nullable(),
  promotedSection: z.enum(['domains', 'dossiers', 'communes', 'sectors']).optional(),
  archivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  period: z.string().optional(),
});

const radarSchema = z.object({
  lastVeille: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z.array(radarEntrySchema),
});

// ---------- Types ----------

export type RadarEntry = z.infer<typeof radarEntrySchema>;

export type PromotedSection = 'domains' | 'dossiers' | 'communes' | 'sectors';

export interface PromotedLink {
  section: PromotedSection;
  slug: string;
}

export interface LocalizedRadarEntry {
  id: string;
  date: string;
  confidence: 'official' | 'estimated' | 'unconfirmed';
  status: 'active' | 'confirmed' | 'archived';
  cards: string[];
  source: { label: string; url: string | null; accessedAt: string };
  nextStep?: string;
  summary?: string;
  description: string;
  promotedTo: string | null;
  promotedSection?: PromotedSection;
  /**
   * Lien « voir la fiche » RÉSOLU côté serveur à partir des collections de
   * contenu réelles, jamais du seul `promotedSection` déclaré. `null` quand
   * `promotedTo` ne correspond à aucune fiche existante : pas de lien plutôt
   * qu'un lien mort. Voir `resolvePromotedLink()`.
   */
  promotedLink: PromotedLink | null;
  archivedAt: string | null;
  period?: string;
}

// ---------- Résolution du lien « voir la fiche » ----------

/**
 * Ensembles de slugs existants par type de fiche, utilisés pour résoudre le
 * VRAI type d'un signal promu. Interface pure (ensembles passés en
 * argument), testable sans dépendre de Velite — voir
 * `getContentPromotionSlugSets()` pour la variante branchée sur les
 * collections réelles.
 */
export interface PromotionSlugSets {
  domains: ReadonlySet<string> | readonly string[];
  dossiers: ReadonlySet<string> | readonly string[];
  communes: ReadonlySet<string> | readonly string[];
  sectors: ReadonlySet<string> | readonly string[];
}

function slugSetHas(set: PromotionSlugSets[PromotedSection], slug: string): boolean {
  return Array.isArray(set) ? set.includes(slug) : (set as ReadonlySet<string>).has(slug);
}

/**
 * Ordre de repli quand `promotedSection` est absent, ou pointe vers une
 * section où la fiche n'existe pas : `domains` d'abord (comportement
 * historique, correct pour la grande majorité des signaux promus — ex.
 * "education" existe à la fois comme domaine et comme secteur, et le
 * domaine est la lecture voulue), puis les types plus spécifiques.
 */
const FALLBACK_SECTION_ORDER: PromotedSection[] = ['domains', 'dossiers', 'communes', 'sectors'];

/**
 * Résout la VRAIE section d'un signal promu. Un `promotedSection` déclaré et
 * valide (la fiche existe bien dans cette section) est respecté tel quel,
 * même quand le même slug existe aussi ailleurs. Un `promotedSection` absent
 * ou qui contredit la réalité (la fiche n'y existe pas) est recalculé à
 * partir des fiches qui existent vraiment : le vrai type l'emporte toujours
 * sur un défaut. Rend `null` si le slug ne correspond à aucune fiche connue —
 * c'était le bug du 24/09/2026 : `promotedSection ?? 'domains'` pointait vers
 * /domaines/<slug> pour 23 signaux qui promouvaient en réalité un dossier ou
 * une commune, produisant 227 - 23 liens valides mais 23 liens en 404 (voir
 * les logs d'accès de production).
 */
export function resolvePromotedSection(
  promotedTo: string | null | undefined,
  storedSection: PromotedSection | undefined,
  slugSets: PromotionSlugSets,
): PromotedSection | null {
  if (!promotedTo) return null;
  if (storedSection && slugSetHas(slugSets[storedSection], promotedTo)) return storedSection;
  for (const section of FALLBACK_SECTION_ORDER) {
    if (slugSetHas(slugSets[section], promotedTo)) return section;
  }
  return null;
}

/** Combine `resolvePromotedSection()` et le slug en un lien prêt à rendre, ou `null`. */
export function resolvePromotedLink(
  promotedTo: string | null | undefined,
  storedSection: PromotedSection | undefined,
  slugSets: PromotionSlugSets,
): PromotedLink | null {
  const section = resolvePromotedSection(promotedTo, storedSection, slugSets);
  return section && promotedTo ? { section, slug: promotedTo } : null;
}

let cachedPromotionSlugSets: PromotionSlugSets | null = null;

/**
 * Variante de `PromotionSlugSets` branchée sur les vraies collections
 * Velite, mémoïsée (les slugs ne changent pas pendant un build/une requête).
 */
export function getContentPromotionSlugSets(): PromotionSlugSets {
  if (!cachedPromotionSlugSets) {
    cachedPromotionSlugSets = {
      domains: getAllDomainSlugs(),
      dossiers: getAllDossierSlugs(),
      communes: getAllCommuneSlugs(),
      sectors: getAllSectorSlugs(),
    };
  }
  return cachedPromotionSlugSets;
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
    summary: entry.summary?.[locale] || entry.summary?.fr,
    description: entry.descriptions[locale] || entry.descriptions.fr,
    promotedTo: entry.promotedTo,
    promotedSection: entry.promotedSection,
    promotedLink: resolvePromotedLink(
      entry.promotedTo,
      entry.promotedSection,
      getContentPromotionSlugSets(),
    ),
    archivedAt: entry.archivedAt,
    period: entry.period,
  };
}

export function getLastVeille(): string {
  return parsed.lastVeille;
}

/**
 * Date de dernier mouvement du radar, pour le sitemap : `lastVeille` (mise à
 * jour à chaque veille, même quand aucune entrée n'est ajoutée ou retirée),
 * ou à défaut la date de l'entrée la plus récente si `lastVeille` est absent
 * — le schéma l'exige aujourd'hui, mais un radar sans lastVeille ne doit pas
 * pour autant retomber sur une date de lancement figée pendant qu'il change
 * à chaque veille.
 */
export function getRadarLastModifiedDate(): Date {
  if (parsed.lastVeille) return new Date(parsed.lastVeille);
  const plusRecente = parsed.entries.reduce(
    (latest, e) => (e.date > latest ? e.date : latest),
    '',
  );
  return plusRecente ? new Date(plusRecente) : new Date(0);
}

export function getVeilleSourceCount(): number {
  return (sourceRegistry as { stats: { total: number } }).stats.total;
}

/**
 * Sources réellement en veille éditoriale : tier `editorial`, hors sources désactivées.
 * `stats.total` additionne la veille éditoriale ET le scan mensuel du radar ; l'annoncer
 * comme « veille active » gonfle le chiffre. Les deux comptes se lisent à l'exécution
 * (`getEditorialSourceCount`, `getActiveSourceCount`) et bougent à chaque ajout de source :
 * ne jamais les recopier en dur ici ni ailleurs. Voir docs/source-registry.json.
 */
/**
 * Toutes les sources actives du registre, veille éditoriale et scan mensuel confondus,
 * hors sources désactivées. À utiliser quand la phrase parle du registre entier
 * (« X sources, toutes listées »), et non du travail quotidien.
 */
export function getActiveSourceCount(): number {
  const { sources } = sourceRegistry as { sources: { enabled?: boolean }[] };
  return sources.filter((s) => s.enabled !== false).length;
}

export function getEditorialSourceCount(): number {
  const { sources } = sourceRegistry as {
    sources: { tier?: string; enabled?: boolean }[];
  };
  return sources.filter((s) => s.tier === 'editorial' && s.enabled !== false).length;
}

export function getActiveSignals(locale: Locale, limit?: number): LocalizedRadarEntry[] {
  const active = parsed.entries
    .filter((e) => e.status === 'active' || e.status === 'confirmed')
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
