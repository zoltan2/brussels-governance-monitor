// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Redirections 301 permanentes pour la migration des slugs dossiers.
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ ⚠ RÈGLE ÉDITORIALE MANDATORY                                          ║
 * ║                                                                        ║
 * ║ Toute modification de `localizedSlugs.{locale}` dans le frontmatter   ║
 * ║ d'un dossier MDX qui change l'URL effective DOIT être accompagnée     ║
 * ║ d'une entrée ici dans LE MÊME COMMIT.                                 ║
 * ║                                                                        ║
 * ║ Sinon : les URLs externes (bookmarks, partages LinkedIn/X, citations  ║
 * ║ presse) qui pointent vers l'ancienne URL renvoient 404 silencieusement.║
 * ║ Pas d'erreur build, pas d'avertissement runtime, pas d'alerte.        ║
 * ║                                                                        ║
 * ║ Voir : mémoire `feedback_localized_slugs_redirect_pairing.md`         ║
 * ║ pour les 3 cas (ajout, renommage slug localisé, renommage canonique)  ║
 * ║ et la checklist PR.                                                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Format : `from` = ancienne URL absolue (avec préfixe locale), `to` =
 * nouvelle URL absolue. Les redirections sont toutes permanentes (HTTP 301).
 *
 * Évaluées au build via `next.config.ts` `redirects()`. Pas de coût runtime.
 *
 * Exemple (commenté tant qu'aucune migration éditoriale n'est effectuée) :
 *
 * ```ts
 * { from: '/nl/dossiers/cpas-bruxellois', to: '/nl/dossiers/ocmw-brussel' },
 * { from: '/en/dossiers/cpas-bruxellois', to: '/en/dossiers/brussels-pcsw' },
 * { from: '/de/dossiers/cpas-bruxellois', to: '/de/dossiers/oeshz-bruessel' },
 * ```
 *
 * Spec : bgm-ops/specs/2026-05-03-localized-slugs-seo.md §3.5
 */
export interface SlugRedirect301 {
  from: string;
  to: string;
}

export const SLUG_REDIRECTS_301: ReadonlyArray<SlugRedirect301> = [
  // Aucune migration éditoriale en cours. Ajouter ici dossier par dossier.
];

/**
 * Convertit la table en format attendu par Next.js `redirects()`.
 * Toutes les redirections sont marquées `permanent: true` (HTTP 301).
 */
export function getRedirectsConfig(): Array<{
  source: string;
  destination: string;
  permanent: true;
}> {
  return SLUG_REDIRECTS_301.map(({ from, to }) => ({
    source: from,
    destination: to,
    permanent: true,
  }));
}
