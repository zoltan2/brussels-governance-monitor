// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { DossierCard } from '@/lib/content';

/** Au-delà, le bloc concurrence le texte au lieu de le prolonger. */
export const RELATED_DOSSIERS_MAX = 3;

type Candidate = Pick<DossierCard, 'slug' | 'relatedDomains' | 'lastModified' | 'draft'>;

/**
 * Choisit les dossiers à proposer sous le texte d'un dossier.
 *
 * - Si le frontmatter porte `relatedDossiers`, cette liste prime : ses slugs, dans
 *   l'ordre donné, sans complément automatique. Un slug inconnu ou en brouillon
 *   est ignoré.
 * - Sinon : les dossiers qui partagent au moins un domaine avec le dossier
 *   courant, les plus récemment modifiés d'abord (slug en départage, pour un
 *   rendu stable d'un build à l'autre).
 *
 * Dans les deux cas : jamais le dossier courant, jamais un brouillon, trois au plus.
 * Fonction pure (candidats en entrée) pour être testable sans Velite.
 */
export function selectRelatedDossiers<T extends Candidate>(
  current: Pick<DossierCard, 'slug' | 'relatedDomains' | 'relatedDossiers'>,
  candidates: readonly T[],
  max = RELATED_DOSSIERS_MAX,
): T[] {
  const eligible = candidates.filter((c) => c.slug !== current.slug && !c.draft);

  if (current.relatedDossiers && current.relatedDossiers.length > 0) {
    const bySlug = new Map(eligible.map((c) => [c.slug, c]));
    const picked = [...new Set(current.relatedDossiers)]
      .map((slug) => bySlug.get(slug))
      .filter((c): c is T => c !== undefined);
    return picked.slice(0, max);
  }

  const domains = new Set(current.relatedDomains);
  return eligible
    .filter((c) => c.relatedDomains.some((d) => domains.has(d)))
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified) || a.slug.localeCompare(b.slug))
    .slice(0, max);
}
