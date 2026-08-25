// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Gardes de la page de relecture du quiz.
 *
 * Volontairement séparées de `src/lib/mergeable-files.ts` et de
 * `src/lib/github-pr.ts`, qui gouvernent la publication de la veille. Élargir
 * ces listes partagées donnerait au pipeline de veille — piloté par un LLM —
 * le droit d'écrire dans les pools de quiz, donc de faire disparaître la
 * mention de l'article 50 sans qu'aucune relecture ait eu lieu. Le fichier
 * `mergeable-files.ts` nomme lui-même le précédent : un préfixe `data/` entier
 * laisserait passer `data/pending-digest.json`, qui pilote l'email des
 * abonnés en onze langues.
 *
 * Module pur : aucun accès réseau, aucun accès disque, testable seul.
 */

import { LOCALES, type Locale } from './quiz-review';

/** Toute branche de relecture porte ce préfixe, et rien d'autre ne le porte. */
export const QUIZ_REVIEW_BRANCH_PREFIX = 'review/quiz-';

export const REVIEW_STATE_PATH = 'data/quiz-review-state.json';

/** Table constante : un chemin de pool ne se construit jamais par
 *  interpolation d'une valeur reçue. */
const POOL_PATHS: Record<Locale, string> = {
  fr: 'public/quiz-data-fr.json',
  nl: 'public/quiz-data-nl.json',
  en: 'public/quiz-data-en.json',
  de: 'public/quiz-data-de.json',
};

export function poolPathFor(locale: Locale): string {
  return POOL_PATHS[locale];
}

/** Les cinq seuls fichiers qu'une PR de relecture peut toucher. */
export const QUIZ_REVIEW_PATHS: readonly string[] = [
  REVIEW_STATE_PATH,
  ...LOCALES.map((l) => POOL_PATHS[l]),
];

export interface PrRef {
  branch: string;
  headRepo: string | null;
  baseRef: string;
}

export interface OpenReviewPr {
  number: number;
  branch: string;
}

export function branchRefusal(branch: string): string | null {
  if (!branch.startsWith(QUIZ_REVIEW_BRANCH_PREFIX)) {
    return `Branche hors périmètre : ${branch}`;
  }
  if (branch.length === QUIZ_REVIEW_BRANCH_PREFIX.length) {
    return 'Branche hors périmètre : le préfixe seul ne suffit pas';
  }
  return null;
}

/**
 * Refus opposé à une PR avant fusion.
 *
 * La garde décisive est `headRepo` : sur une PR ouverte depuis un fork, le nom
 * de branche est choisi par son auteur, donc un inconnu peut imiter n'importe
 * quel préfixe. `null` signale un fork supprimé, cas également refusé.
 */
export function prRefusal(pr: PrRef, repo: string): string | null {
  if (pr.headRepo !== repo) {
    return `PR issue d'un autre dépôt : ${pr.headRepo ?? 'dépôt supprimé'}`;
  }
  if (pr.baseRef !== 'main') {
    return `PR dont la base n'est pas main : ${pr.baseRef}`;
  }
  return branchRefusal(pr.branch);
}

export function fileSetRefusal(paths: string[]): string | null {
  if (paths.length === 0) {
    return 'Aucun fichier : une PR de relecture vide n’a rien à fusionner';
  }
  const outside = paths.filter((p) => !QUIZ_REVIEW_PATHS.includes(p));
  if (outside.length > 0) {
    return `Fichiers hors périmètre : ${outside.join(', ')}`;
  }
  return null;
}

/**
 * Une seule session de relecture ouverte à la fois.
 *
 * Deux branches issues du même `main` réécrivent toutes deux
 * `data/quiz-review-state.json` en entier. Git ne voit aucun conflit tant
 * qu'aucune n'est fusionnée, les contrôles passent au vert sur les deux, puis
 * la seconde fusion casse — et la résolution manuelle évidente, garder un
 * côté, jette un lot entier de décisions humaines.
 */
export function secondSessionRefusal(open: OpenReviewPr[]): string | null {
  if (open.length === 0) return null;
  const numbers = open.map((p) => `#${p.number}`).join(', ');
  return `Une session de relecture est déjà ouverte (${numbers}). Fusionnez-la avant d'en commencer une autre.`;
}

/**
 * Message de commit, construit de constantes et de compteurs uniquement.
 *
 * Aucun texte saisi par l'utilisateur n'y entre : un `[skip ci]` glissé dans
 * une note désactiverait les workflows en silence — la relecture serait
 * enregistrée et rien ne serait déployé — et un saut de ligne permettrait de
 * forger des lignes de trailer dans l'historique public.
 */
export function commitMessageFor(counts: {
  approved: number;
  rejected: number;
  notes?: string[];
}): string {
  const parts = [`${counts.approved} approuvée(s)`, `${counts.rejected} retirée(s)`];
  return `content(quiz): relecture — ${parts.join(', ')}`;
}
