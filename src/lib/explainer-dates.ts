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
 * Seedée le 20/09/2026, puis corrigée le jour même : la seed initiale gardait
 * SITE_LAUNCH_DATE partout sauf « brussels-paradox », sans vérifier les
 * autres entrées — « brussels-overview » portait déjà une date fausse dès la
 * création de la table (réécrite le 19/09/2026, commit eb552ae4, mais laissée
 * à SITE_LAUNCH_DATE). Chaque entrée ci-dessous est vérifiée par
 * `git log -L<début>,<fin>:messages/fr.json` sur le bloc `explainers.<clé>`
 * correspondant (et, quand une locale divergeait, sur les trois autres
 * fichiers messages/*.json) — pas déduite ni recopiée d'une autre entrée.
 * Une entrée à SITE_LAUNCH_DATE signifie : dernier commit qui touche cette
 * clé daté au plus tôt le 12/02/2026 (lancement), jamais retouchée depuis.
 *
 * Garde-fou : scripts/content-lint/explainer-messages-date.ts (branché sur le
 * pré-vol) échoue désormais si une PR réécrit `explainers.<clé>` dans
 * messages/*.json sans faire bouger l'entrée correspondante ici.
 *
 * ⚠️ Toute nouvelle route sous src/app/[locale]/explainers/ DOIT recevoir une
 * entrée ici : src/lib/__tests__/explainer-dates.test.ts échoue sinon
 * (comparaison avec le contenu réel du dossier sur disque).
 */

export const SITE_LAUNCH_DATE = '2026-02-12';

export const EXPLAINER_LAST_MODIFIED: Record<string, string> = {
  // PIB, navetteurs, institutions internationales (commit eb552ae4, PR #510).
  'brussels-overview': '2026-09-19',
  // Table de compétences retirée au profit d'un lien vers who-decides-what
  // (commit c87c7734).
  'levels-of-power': '2026-03-01',
  'government-formation': SITE_LAUNCH_DATE,
  // Réécriture texte validé le 19/09/2026 (PR #509).
  'brussels-paradox': '2026-09-19',
  'parliament-powers': SITE_LAUNCH_DATE,
  // Page créée après le lancement (commit f5412fbb, architecture multi-entités).
  'brussels-cosmopolitan': '2026-02-16',
  // Budget régional : 17,3 % du PIB belge en 2023, IBSA (commit eb552ae4, PR #510).
  'brussels-region': '2026-09-19',
  // Lien « Voir aussi : la VGC » ajouté (commit 300e03d5).
  cocom: '2026-03-01',
  // Page créée après le lancement (commit f5412fbb, architecture multi-entités).
  cocof: '2026-02-16',
  // Page créée après le lancement (commit f5412fbb, architecture multi-entités).
  vgc: '2026-02-16',
  // Page créée après le lancement (commit f5412fbb, architecture multi-entités).
  'communities-in-brussels': '2026-02-16',
  // Volet fiscal corrigé (17,3 % du PIB belge en 2023) (commit eb552ae4, PR #510).
  'federal-and-brussels': '2026-09-19',
  // Lien vers le nouveau dossier vice-gouverneur ajouté (commit 2b9d0e08, PR #285).
  'who-decides-what': '2026-06-15',
  // Correction de grammaire allemande « Vom Gewest » → « Von der Region »
  // dans messages/de.json (commit df17ea9b, PR #469), postérieure à la
  // création de la page (commit 2b9d0e08, PR #285, le 15/06/2026).
  'vice-gouverneur': '2026-09-11',
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
