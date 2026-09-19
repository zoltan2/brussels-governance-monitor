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
 *   courant, classés par nombre de domaines partagés (décroissant), puis par
 *   date de modification (la plus récente d'abord), puis par slug pour un rendu
 *   stable d'un build à l'autre. Le nombre de domaines passe avant la date : un
 *   seul domaine secondaire en commun (sécurité, budget) ramenait sinon le
 *   dossier le plus récent du site, sans lien réel avec le sujet.
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
  const shared = (c: T) => new Set(c.relatedDomains.filter((d) => domains.has(d))).size;
  return eligible
    .map((c) => ({ c, n: shared(c) }))
    .filter(({ n }) => n > 0)
    .sort(
      (a, b) =>
        b.n - a.n ||
        b.c.lastModified.localeCompare(a.c.lastModified) ||
        a.c.slug.localeCompare(b.c.slug),
    )
    .slice(0, max)
    .map(({ c }) => c);
}
