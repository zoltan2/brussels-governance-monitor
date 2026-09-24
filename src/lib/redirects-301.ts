// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Redirections 301 permanentes : toute page publiée dont l'URL change.
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ ⚠ RÈGLE ÉDITORIALE MANDATORY                                          ║
 * ║                                                                        ║
 * ║ Toute modification qui change l'URL d'une page publiée (dossier,      ║
 * ║ domaine, solution, secteur, comparaison, commune, archive,            ║
 * ║ vérification) DOIT être accompagnée d'une entrée ici dans LE MÊME     ║
 * ║ COMMIT : slug renommé, `localizedSlugs.{locale}` d'un dossier ajouté  ║
 * ║ ou changé, fichier supprimé, date d'une vérification corrigée, ou     ║
 * ║ segment localisé renommé dans src/i18n/routing.ts.                    ║
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
 * Entrée générique, pour un segment localisé renommé dans routing.ts (et
 * seulement ce cas) : `{ from: '/fr/secteurs/:slug', to: '/fr/filieres/:slug' }`.
 * Next l'applique telle quelle (path matching de redirects() : `:slug` vaut
 * exactement un segment). L'ordre compte comme chez Next, la première entrée
 * qui correspond l'emporte : une entrée exacte qui doit primer sur une entrée
 * générique se place AVANT elle.
 *
 * Évaluées au build via `next.config.ts` `redirects()`, appliquées avant le
 * proxy next-intl et avant les routes. Pas de coût runtime.
 *
 * Contrôlé en CI par scripts/content-lint/slug-redirects.ts : une URL de page
 * servie sur main et perdue par la PR fait échouer la vérification tant que
 * l'entrée correspondante manque. La table elle-même doit rester plate (pas
 * de chaîne A → B → C : réécrire A → C), sans boucle, une entrée par `from`,
 * même langue des deux côtés, cible servie (page de contenu, index ou page
 * statique de routing.ts).
 *
 * Exemple (commenté tant qu'aucune migration éditoriale n'est effectuée) :
 *
 * ```ts
 * { from: '/nl/dossiers/cpas-bruxellois', to: '/nl/dossiers/ocmw-brussel' },
 * { from: '/fr/communes/bruxelles', to: '/fr/communes/bruxelles-ville' },
 * { from: '/fr/secteurs/:slug', to: '/fr/filieres/:slug' },
 * ```
 *
 * Spec : bgm-ops/specs/2026-05-03-localized-slugs-seo.md §3.5
 */
export interface SlugRedirect301 {
  from: string;
  to: string;
}

// Renommer une fiche : le contrôle reconnaît le renommage via `git diff -M`
// (similarité ≥ 50 %). Si le texte est aussi fortement réécrit dans le même
// commit, git y voit une suppression plus une création, et le contrôle demande
// « une décision explicite » : ajouter ici la redirection ancienne → nouvelle
// adresse, exactement comme pour un renommage simple. Plus sûr encore : renommer
// dans un commit, réécrire dans le suivant.
export const SLUG_REDIRECTS_301: ReadonlyArray<SlugRedirect301> = [
  // Aucune migration éditoriale en cours. Ajouter ici page par page.
];

/**
 * URL de pages retirées VOLONTAIREMENT, sans redirection (fiche supprimée sans
 * successeur), tous types confondus. Décision explicite exigée par le contrôle
 * CI : sans entrée ici ni redirection, la suppression d'une fiche publiée fait
 * échouer la PR. `raison` est obligatoire et non vide.
 */
export interface RetiredUrl {
  path: string;
  raison: string;
}

export const URLS_RETIREES: ReadonlyArray<RetiredUrl> = [
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
