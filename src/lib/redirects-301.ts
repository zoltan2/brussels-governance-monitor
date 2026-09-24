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
 * nouvelle URL absolue. Les redirections sont toutes permanentes. Next.js
 * répond 308 (et non 301) pour `permanent: true` : même effet pour les moteurs
 * et les navigateurs, la méthode HTTP est conservée en plus.
 *
 * Évaluées au build via `next.config.ts` `redirects()`, appliquées avant le
 * proxy next-intl et avant les routes. Pas de coût runtime.
 *
 * Contrôlé en CI par scripts/content-lint/slug-redirects.ts : une URL de
 * dossier servie sur main et perdue par la PR fait échouer la vérification
 * tant que l'entrée correspondante manque. La table elle-même doit rester
 * plate (pas de chaîne A → B → C : réécrire A → C), sans boucle, une entrée
 * par `from`, même langue des deux côtés, cible servie.
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
 * URL de dossier retirées VOLONTAIREMENT, sans redirection (dossier supprimé
 * sans successeur). Décision explicite exigée par le contrôle CI : sans entrée
 * ici ni redirection, la suppression d'un dossier fait échouer la PR.
 * `raison` est obligatoire et non vide.
 */
export interface RetiredDossierUrl {
  path: string;
  raison: string;
}

export const DOSSIER_URLS_RETIREES: ReadonlyArray<RetiredDossierUrl> = [
  // Aucune.
];

/**
 * Convertit la table en format attendu par Next.js `redirects()`.
 * Toutes les redirections sont marquées `permanent: true` (Next.js répond 308).
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
