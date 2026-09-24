// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Contrôles CROISÉS de data/radar.json contre les collections de contenu
 * réelles : le schéma Zod (src/lib/radar.ts) valide la FORME du fichier,
 * mais pas que `promotedTo`/`promotedSection` pointent vers une fiche qui
 * existe vraiment, ni que `cards[]` référence des fiches connues. C'est ce
 * qui a laissé passer 23 signaux dont le lien « voir la fiche » pointait
 * vers /domaines/<slug> pour un slug qui n'existe QUE comme dossier ou
 * commune (404 en production, vu dans les logs d'accès du 24/09/2026).
 *
 * Logique pure — les ensembles de slugs sont passés en argument — pour
 * rester testable sans Velite ni accès au système de fichiers. Voir
 * scripts/content-lint/data-schemas.ts pour le branchement sur
 * content/*.
 */

import type { PromotedSection, PromotionSlugSets } from './radar';
import { resolvePromotedSection } from './radar';

export interface RadarPromotionEntryInput {
  id: string;
  promotedTo: string | null;
  promotedSection?: PromotedSection;
}

export interface RadarPromotionViolation {
  id: string;
  message: string;
}

/**
 * Violations de `promotedTo`/`promotedSection` : slug introuvable dans
 * aucune collection, `promotedSection` absent alors que la fiche n'est PAS
 * un domaine (le seul cas où l'absence est aujourd'hui sans risque, car le
 * rendu replie sur `domains`), ou `promotedSection` qui contredit le vrai
 * type de la fiche. BLOQUANT : ces trois cas produisent un lien mort.
 */
export function checkRadarPromotions(
  entries: readonly RadarPromotionEntryInput[],
  slugSets: PromotionSlugSets,
): RadarPromotionViolation[] {
  const violations: RadarPromotionViolation[] = [];

  for (const entry of entries) {
    if (!entry.promotedTo) continue;

    const effective = resolvePromotedSection(entry.promotedTo, entry.promotedSection, slugSets);

    if (!effective) {
      violations.push({
        id: entry.id,
        message: `${entry.id} : promotedTo "${entry.promotedTo}" ne correspond à aucune fiche (domaines, dossiers, communes ou secteurs).`,
      });
      continue;
    }

    if (!entry.promotedSection) {
      // Slug présent dans plusieurs collections (ex. « education », « digital » :
      // domaine ET secteur) : le repli choisirait le domaine en silence, peut-être
      // à tort. Le type doit être écrit, même quand c'est le domaine (revue #592).
      const collections = (Object.keys(slugSets) as PromotedSection[]).filter((s) => {
        const set = slugSets[s];
        return Array.isArray(set)
          ? set.includes(entry.promotedTo!)
          : (set as ReadonlySet<string>).has(entry.promotedTo!);
      });
      if (collections.length > 1) {
        violations.push({
          id: entry.id,
          message: `${entry.id} : promotedTo "${entry.promotedTo}" existe dans plusieurs types de fiches (${collections.join(', ')}) — préciser promotedSection.`,
        });
        continue;
      }
      if (effective !== 'domains') {
        violations.push({
          id: entry.id,
          message: `${entry.id} : promotedSection absent pour promotedTo "${entry.promotedTo}" — devrait valoir "${effective}" (le repli implicite sur "domains" pointerait vers une fiche inexistante).`,
        });
      }
      continue;
    }

    if (entry.promotedSection !== effective) {
      violations.push({
        id: entry.id,
        message: `${entry.id} : promotedSection "${entry.promotedSection}" contredit le vrai type de "${entry.promotedTo}" — devrait valoir "${effective}".`,
      });
    }
  }

  return violations;
}

export type CardCollection =
  'domains' | 'dossiers' | 'communes' | 'sectors' | 'comparisons' | 'solutions';

export type CardSlugSets = Record<CardCollection, ReadonlySet<string> | readonly string[]>;

export interface RadarCardSlugViolation {
  id: string;
  card: string;
}

function cardSlugSetHas(set: CardSlugSets[CardCollection], slug: string): boolean {
  return Array.isArray(set) ? set.includes(slug) : (set as ReadonlySet<string>).has(slug);
}

const ALL_CARD_COLLECTIONS: CardCollection[] = [
  'domains',
  'dossiers',
  'communes',
  'sectors',
  'comparisons',
  'solutions',
];

/**
 * Slugs de `cards[]` introuvables dans AUCUNE collection connue. NON
 * bloquant pour l'instant (voir consigne de la PR qui a introduit ce
 * contrôle) : signalé pour audit, sans faire échouer le pré-vol/CI tant que
 * la cible correcte de chaque violation existante n'est pas confirmée.
 */
export function checkRadarCardSlugs(
  entries: readonly { id: string; cards: readonly string[] }[],
  slugSets: CardSlugSets,
): RadarCardSlugViolation[] {
  const violations: RadarCardSlugViolation[] = [];
  for (const entry of entries) {
    for (const card of entry.cards) {
      const exists = ALL_CARD_COLLECTIONS.some((collection) =>
        cardSlugSetHas(slugSets[collection], card),
      );
      if (!exists) violations.push({ id: entry.id, card });
    }
  }
  return violations;
}
