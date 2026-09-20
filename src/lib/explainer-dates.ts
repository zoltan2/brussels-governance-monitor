// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Dates de dernière réécriture connue des pages /explainers/*.
 *
 * Ces pages ne sont pas du contenu Velite (pas de frontmatter `lastModified`
 * à lire) : ce sont des composants React sous
 * src/app/[locale]/explainers/<slug>/page.tsx. Faute d'une date fiable
 * ailleurs, le sitemap (src/app/sitemap.ts) lit cette table plutôt que
 * d'annoncer SITE_LAUNCH_DATE pour toujours — ce qui ferait passer une page
 * réellement réécrite pour abandonnée depuis le lancement aux yeux de
 * Google.
 *
 * Seed le 20/09/2026 avec ce que l'historique git du dépôt sait de façon
 * vérifiable : « brussels-paradox » a été réécrite le 19/09/2026 (PR #509,
 * commit a909b45a's ancêtre 2026-09-19 « réécrire la page paradoxe
 * bruxellois »). Toutes les autres gardent SITE_LAUNCH_DATE faute de mieux :
 * ce n'est pas une garantie qu'elles n'ont pas changé, seulement l'absence
 * d'une date de réécriture vérifiée à ce jour.
 *
 * ⚠️ Toute nouvelle route sous src/app/[locale]/explainers/ DOIT recevoir une
 * entrée ici : src/lib/__tests__/explainer-dates.test.ts échoue sinon
 * (comparaison avec le contenu réel du dossier sur disque).
 */

export const SITE_LAUNCH_DATE = '2026-02-12';

export const EXPLAINER_LAST_MODIFIED: Record<string, string> = {
  'brussels-overview': SITE_LAUNCH_DATE,
  'levels-of-power': SITE_LAUNCH_DATE,
  'government-formation': SITE_LAUNCH_DATE,
  // Réécriture texte validé le 19/09/2026 (PR #509).
  'brussels-paradox': '2026-09-19',
  'parliament-powers': SITE_LAUNCH_DATE,
  'brussels-cosmopolitan': SITE_LAUNCH_DATE,
  'brussels-region': SITE_LAUNCH_DATE,
  cocom: SITE_LAUNCH_DATE,
  cocof: SITE_LAUNCH_DATE,
  vgc: SITE_LAUNCH_DATE,
  'communities-in-brussels': SITE_LAUNCH_DATE,
  'federal-and-brussels': SITE_LAUNCH_DATE,
  'who-decides-what': SITE_LAUNCH_DATE,
  'vice-gouverneur': SITE_LAUNCH_DATE,
};

/**
 * Date de dernière réécriture d'une page explicative, pour le sitemap.
 * Lève plutôt que de deviner SITE_LAUNCH_DATE en silence : une route sans
 * entrée ici doit casser le build du sitemap, pas s'afficher avec une date
 * fausse.
 */
export function getExplainerLastModified(slug: string): Date {
  const dateStr = EXPLAINER_LAST_MODIFIED[slug];
  if (!dateStr) {
    throw new Error(
      `Pas de date connue pour la page explicative "${slug}" — ajoute-la dans ` +
        'EXPLAINER_LAST_MODIFIED (src/lib/explainer-dates.ts).',
    );
  }
  return new Date(dateStr);
}
