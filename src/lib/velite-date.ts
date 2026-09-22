// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Ramener une date issue de Velite à la forme `AAAA-MM-JJ`.
 *
 * ⚑ LE PIÈGE, ET IL A DÉJÀ MORDU DEUX FOIS.
 *
 * Le frontmatter porte `lastModified: "2026-09-13"`, mais `s.isodate()` valide
 * la chaîne PUIS la normalise en horodatage complet. La valeur qui sort de
 * `.velite/` est donc `"2026-09-13T00:00:00.000Z"`, jamais `"2026-09-13"`.
 *
 * Conséquences constatées :
 *
 * 1. Le `permalink` calculé au schéma des vérifications valait
 *    `/verifications/budget-2026-02-08T00:00:00.000Z` : jamais une URL
 *    utilisable. Resté invisible tant qu'aucune route ne le servait.
 * 2. L'écran `/admin/relecture` annonçait **180 FAQ en retard et 180 chapeaux
 *    périmés**, soit la TOTALITÉ des fiches domaine et dossier. Motif réel de
 *    chacune : « illisible ». `checkFaqReview` et `checkSummaryFreshness`
 *    exigent `^\d{4}-\d{2}-\d{2}$` ; aucun horodatage ne passe ce test, donc
 *    toutes les fiches tombaient en verdict `unparsable`, donc toutes étaient
 *    listées. Un tableau de bord qui signale tout ne signale rien.
 *
 * ⚑ POURQUOI LA CI NE VOYAIT RIEN. Les lints `scripts/content-lint/*.ts`
 * lisent le frontmatter BRUT des `.mdx` et reçoivent donc de vraies dates :
 * ils fonctionnaient correctement. Seuls les consommateurs de la sortie Velite
 * étaient touchés. Vert en CI, faux à l'écran.
 *
 * ⚑ RÈGLE. Toute valeur `s.isodate()` lue depuis une collection Velite passe
 * par ici avant d'être comparée, découpée ou insérée dans une URL. Ne pas
 * assouplir les `ISO_DATE` des vérificateurs à la place : leur contrat strict
 * est ce qui leur permet de détecter un frontmatter réellement malformé.
 */

/** `AAAA-MM-JJ`, éventuellement suivi d'une heure — ce que rend `s.isodate()`. */
const DATE_OU_HORODATAGE = /^(\d{4}-\d{2}-\d{2})(?:[T ].*)?$/;

/**
 * Rend le jour `AAAA-MM-JJ`, que l'entrée soit déjà un jour ou un horodatage
 * complet. Rend `undefined` pour une entrée absente, et laisse passer une
 * chaîne réellement illisible TELLE QUELLE, pour que le vérificateur en aval
 * rende son verdict `unparsable` et que l'erreur reste visible.
 */
export function jourISO(valeur: string | undefined): string | undefined {
  if (valeur === undefined) return undefined;
  const m = DATE_OU_HORODATAGE.exec(valeur);
  return m ? m[1] : valeur;
}
