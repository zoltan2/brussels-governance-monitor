// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * « Trois informations prêtes à citer » de la page Presse & données.
 *
 * Aucune valeur ici : la configuration ne porte que des SLUGS. Le chiffre, son
 * libellé, sa source, sa date et le niveau de confiance sont repris du chiffre
 * clé de la fiche (`metrics[0]`, celui que l'accueil affiche en tête de carte).
 * Recopier la valeur créerait une seconde vérité, qui divergerait à la première
 * veille (voir content-integrity, règle 3).
 *
 * Une fiche retirée ou sans chiffre clé ne fait pas planter la page : l'entrée
 * disparaît. Le test `press-facts.test.ts` vérifie que chaque slug existe dans
 * `content/`, pour que cette disparition ne passe pas inaperçue.
 */

import { getDomainCard, getDossierCard, getLocalizedSlug } from '@/lib/content';
import { jourISO } from '@/lib/velite-date';
import type { Locale } from '@/i18n/routing';

export type FactCollection = 'domain' | 'dossier';

export interface PressFactRef {
  collection: FactCollection;
  slug: string;
}

/** Choix éditorial : trois chiffres clés récents, de confiance « officielle ». */
export const PRESS_READY_FACTS: readonly PressFactRef[] = [
  { collection: 'domain', slug: 'budget' },
  { collection: 'dossier', slug: 'lez' },
  { collection: 'dossier', slug: 'taxis-bruxellois' },
];

export interface PressFact {
  collection: FactCollection;
  /** Slug canonique, pour la mesure d'audience. */
  slug: string;
  /** Slug de l'URL dans la langue (dossiers à slug localisé). */
  routeSlug: string;
  pageTitle: string;
  label: string;
  value: string;
  unit: string | null;
  source: string | null;
  sourceUrl: string | null;
  /** Jour de la donnée, AAAA-MM-JJ. */
  date: string;
  confidence: 'official' | 'estimated' | 'unconfirmed';
}

export function resolvePressFact(ref: PressFactRef, locale: Locale): PressFact | null {
  if (ref.collection === 'domain') {
    const card = getDomainCard(ref.slug, locale)?.card;
    const m = card?.metrics[0];
    if (!card || card.draft || !m) return null;
    return {
      collection: 'domain',
      slug: card.slug,
      routeSlug: card.slug,
      pageTitle: card.title,
      label: m.label,
      value: m.value,
      unit: m.unit ?? null,
      source: m.source ?? null,
      sourceUrl: m.url ?? null,
      date: jourISO(m.date) ?? m.date,
      confidence: card.confidenceLevel,
    };
  }
  const card = getDossierCard(ref.slug, locale)?.card;
  const m = card?.metrics[0];
  if (!card || card.draft || !m) return null;
  return {
    collection: 'dossier',
    slug: card.slug,
    routeSlug: getLocalizedSlug(card, locale),
    pageTitle: card.shortTitle ?? card.title,
    label: m.label,
    value: m.value,
    unit: m.unit ?? null,
    source: m.source ?? null,
    sourceUrl: m.url ?? null,
    date: jourISO(m.date) ?? m.date,
    confidence: card.confidenceLevel,
  };
}

export function getPressFacts(locale: Locale, refs: readonly PressFactRef[] = PRESS_READY_FACTS): PressFact[] {
  return refs.map((r) => resolvePressFact(r, locale)).filter((f): f is PressFact => f !== null);
}

/** Chemin interne de la fiche, pour `canonicalUrl` et la citation. */
export function pressFactPath(fact: Pick<PressFact, 'collection' | 'routeSlug'>): string {
  return fact.collection === 'domain' ? `/domains/${fact.routeSlug}` : `/dossiers/${fact.routeSlug}`;
}

/** Le chiffre tel qu'on le lit : valeur puis unité. */
export function pressFactFigure(fact: Pick<PressFact, 'value' | 'unit'>): string {
  return fact.unit ? `${fact.value} ${fact.unit}` : fact.value;
}
