// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readGuardFrontmatter } from './frontmatter';

/**
 * Longueur maximale du chapeau `summary`.
 *
 * POURQUOI CE LINT EXISTE, ALORS QUE LE SCHÉMA POSE DÉJÀ UN `max()`.
 *
 * `velite.config.ts` déclare `summary: s.string().max(500)` sur six collections.
 * **Cette contrainte ne bloque rien**, exactement comme le `max(120)` du titre
 * (voir `src/lib/title-length.ts`) : Velite l'écrit en `info` et le build
 * réussit. Au 22/09/2026, 38 chapeaux dépassaient (dossiers et chronologie de
 * formation), jusqu'à 1 036 caractères (`dossiers/bim-bruxelles.de`), le double
 * du maximum, sans que rien ne rougisse. Le décompte du lint et celui des
 * `info` de Velite portent sur les 38 mêmes fichiers.
 *
 * Le chapeau alimente la meta description, le JSON-LD `Article`, le bouton
 * Partager, la carte de liste, le prompt du chatbot et l'API publique
 * `/api/v1/cards`. Un chapeau qui gonfle à chaque veille déborde partout à la
 * fois.
 *
 * COMMENT ON COMPTE. Comme Zod, que Velite utilise : `.max(500)` compare
 * `string.length`, soit des unités de code UTF-16. Pas des octets (un « é »
 * pèse deux octets en UTF-8 et compte pour un), pas des graphèmes (un emoji
 * hors plan de base compte pour deux). Et SANS `trim()` : Zod ne rogne pas, un
 * bloc YAML `>` qui garde son saut de ligne final le compte. Mesurer autrement
 * que Velite ferait diverger le lint et l'`info` du build, et plus personne ne
 * saurait lequel croire.
 *
 * CE QUE CE LINT NE FAIT PAS. Il ne juge pas le texte, et en mode CI il ne
 * bloque que les chapeaux NOUVEAUX ou MODIFIÉS (voir `shouldBlockSummary`). La
 * dette existante se résorbe au rythme des réécritures ; ce qui est interdit,
 * c'est d'en créer de la nouvelle.
 */

/**
 * Maximum déclaré au schéma Velite.
 *
 * ⚑ Recopié ici parce que `velite.config.ts` ne l'exporte pas, et verrouillé par
 * `src/lib/summary-length.test.ts`, qui lit le schéma et échoue si une seule
 * collection déclare un autre maximum.
 */
export const SUMMARY_MAX = 500;

/**
 * Collections qui déclarent `summary: s.string().max(500)` au schéma Velite.
 *
 * Toutes celles qui ont un `summary`, et seulement elles : domaines, dossiers,
 * événements de la chronologie de formation, chapitres de l'accord de
 * gouvernement, vérifications, pages d'archive. `content/digest` n'a pas de
 * champ `summary` et n'y figure donc pas ; les fiches secteur, communes,
 * comparaisons et solutions non plus.
 *
 * Contrairement au lint de titre, la chronologie de formation est couverte :
 * le titre d'un événement n'a pas d'URL propre, mais son chapeau est bien
 * soumis au même `max()` du schéma, et c'est ce `max()` que ce lint fait
 * respecter, pas un budget d'affichage.
 *
 * ⚑ Verrouillée par `src/lib/summary-length.test.ts`, qui dérive la liste de
 * `velite.config.ts` : une collection qui gagne ou perd son `summary` fait
 * rougir le test, au lieu de sortir du contrôle en silence.
 */
export const SUMMARY_DIRS = [
  'content/domain-cards',
  'content/dossiers',
  'content/formation-events',
  'content/government-chapters',
  'content/verifications',
  'content/archive-pages',
] as const;

export type SummaryLengthVerdict = 'ok' | 'too-long' | 'missing';

export interface SummaryLengthCheck {
  verdict: SummaryLengthVerdict;
  /** Longueur mesurée, en unités de code UTF-16, comme Zod. */
  length: number;
  /** Dépassement en unités de code, 0 si conforme. */
  overflow: number;
}

/**
 * Chapeau tel que Velite le reçoit : la chaîne YAML brute, sans `trim()`.
 *
 * `readFrontmatterScalar` rogne les espaces de bord, ce qui convient aux dates
 * mais sous-compterait ici. Rend undefined si la clé est absente ou si sa valeur
 * n'est pas une chaîne. Lève `FrontmatterError` sur un YAML illisible.
 */
export function readSummary(fileContent: string): string | undefined {
  const data = readGuardFrontmatter(fileContent);
  if (!data || !Object.prototype.hasOwnProperty.call(data, 'summary')) return undefined;
  const value = data.summary;
  return typeof value === 'string' ? value : undefined;
}

export function checkSummaryLength(summary: string | undefined): SummaryLengthCheck {
  if (summary === undefined || summary.trim() === '') {
    return { verdict: 'missing', length: 0, overflow: 0 };
  }
  // `.length` et non un comptage d'octets ou de graphèmes : c'est ce que fait
  // `z.string().max()`. Le test le verrouille avec des accents et une espace
  // insécable fine.
  const length = summary.length;
  return {
    verdict: length > SUMMARY_MAX ? 'too-long' : 'ok',
    length,
    overflow: Math.max(0, length - SUMMARY_MAX),
  };
}

/**
 * NE BLOQUER QUE LA DETTE CRÉÉE, PAS CELLE QUI TRAÎNE.
 *
 * Même règle que le lint de titre : une veille republie des dizaines de fiches
 * sans toucher à leur chapeau, et un lint qui les arrêterait toutes finirait
 * contourné par `--no-verify`.
 *
 * @param current  chapeau actuel de la fiche.
 * @param atBase   chapeau sur la branche de base : `null` si la fiche est
 *                 nouvelle, `undefined` si elle existait sans chapeau lisible.
 *                 Omis (pas de base fournie) : mode strict, tout dépassement
 *                 bloque.
 */
export function shouldBlockSummary(params: {
  current: string | undefined;
  atBase?: string | null | undefined;
  hasBase: boolean;
}): boolean {
  const { current, atBase, hasBase } = params;
  if (checkSummaryLength(current).verdict !== 'too-long') return false;
  if (!hasBase) return true; // sans base, on contrôle tout : mode strict.
  if (atBase === null) return true; // fiche nouvelle : aucune dette héritée.
  return atBase !== current; // chapeau modifié : on n'allonge pas la dette.
}

/** Locale d'une fiche, tirée du nom `slug.fr.mdx`. */
export function localeOf(file: string): string {
  const match = /\.([a-z]{2})\.mdx$/.exec(file);
  return match ? match[1] : '?';
}

/** Message d'erreur destiné à un humain qui vient de casser la règle. */
export function explainSummaryLength(check: SummaryLengthCheck, file: string): string {
  const locale = localeOf(file);
  if (check.verdict === 'missing') return `chapeau (summary) absent du frontmatter, locale ${locale}.`;
  return `chapeau (summary) de ${check.length} caractères, locale ${locale}, maximum ${SUMMARY_MAX} au schéma Velite : ${check.overflow} de trop. Raccourcir le chapeau.`;
}
