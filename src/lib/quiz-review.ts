// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Logique partagée de la relecture du quiz.
 *
 * Ce module est la SEULE implémentation du hash de relecture et du calcul du
 * compteur : `scripts/quiz-provenance.ts` le ré-exporte pour ses six
 * consommateurs, et les routes d'administration l'importent directement. Deux
 * implémentations divergeant d'un caractère invalideraient en silence les 269
 * relectures enregistrées.
 *
 * ⚠️ Ce module importe `crypto` : il n'est PAS importable depuis un composant
 * client. La règle à tenir est que le client ne reçoit que des valeurs déjà
 * calculées côté serveur, jamais une fonction de hash.
 */

import crypto from 'crypto';

export const LOCALES = ['fr', 'nl', 'en', 'de'] as const;
export type Locale = (typeof LOCALES)[number];

/** Champs d'une question dont dépend la relecture. */
export interface QuizQuestionLike {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'edited';

/** Version de l'algorithme de hash ayant estampillé une entrée.
 *  Absente = v1, la seule qui existait avant le 2026-08-25. */
export type HashVersion = 1 | 2;

export interface ReviewEntry {
  status: ReviewStatus;
  reviewedAt: string;
  reviewedBy: string;
  /** Hash de la question au moment de la relecture. S'il ne correspond plus,
   *  la question a changé depuis et retombe en attente, sans effacer la trace
   *  de la relecture précédente. */
  reviewedHash: string;
  hashVersion?: HashVersion;
  note?: string;
}

export interface ReviewState {
  updatedAt: string;
  entries: Record<string, ReviewEntry>;
}

/**
 * Clé d'une question dans l'état de relecture.
 *
 * ⚠️ Les `id` sont IDENTIQUES d'une langue à l'autre (`domain-budget-0` existe
 * en fr, nl, en et de). Indexer sur l'`id` seul ferait que la dernière locale
 * écrite écrase les précédentes.
 */
export function reviewKey(locale: Locale, id: string): string {
  return `${locale}:${id}`;
}

/**
 * Séparateur de champs du hash : un octet NUL, écrit en séquence
 * d'échappement et jamais en caractère brut. Le remplacer par une espace ne
 * lève aucune erreur — `isReviewed` renvoie simplement `false` partout et
 * toutes les relectures disparaissent. Verrouillé par un vecteur figé dans
 * `quiz-review.test.ts`.
 */
const SEP = '\u0000';

function digest(payload: string): string {
  return (
    'sha256:' +
    crypto.createHash('sha256').update(payload, 'utf-8').digest('hex').slice(0, 32)
  );
}

/** Hash historique : le texte visible d'une question, rien d'autre. */
export function hashQuestionV1(q: QuizQuestionLike): string {
  return digest([q.question, ...q.options, q.explanation].join(SEP));
}

/**
 * Hash v2 : ajoute le corrigé.
 *
 * Le v1 ignore `correct`, si bien qu'une bonne réponse déplacée laisse la
 * question « relue » indéfiniment, alors que c'est précisément ce que la
 * relecture valide. L'index vit dans un champ distinct, pour qu'un v2 ne
 * puisse jamais coïncider avec un v1.
 */
export function hashQuestionV2(q: QuizQuestionLike): string {
  return digest(
    [q.question, ...q.options, `correct=${q.correct}`, q.explanation].join(SEP),
  );
}

/** Hash à comparer pour une entrée donnée, selon la version qu'elle déclare. */
export function hashForEntry(q: QuizQuestionLike, entry: ReviewEntry): string {
  return entry.hashVersion === 2 ? hashQuestionV2(q) : hashQuestionV1(q);
}

/** Version écrite par toute relecture nouvelle. */
export const CURRENT_HASH_VERSION: HashVersion = 2;

/**
 * Une question est relue si son entrée est `approved` ou `edited` ET que le
 * hash correspond encore. `rejected` ne compte jamais : la question a été
 * retirée du quiz, pas validée.
 */
export function isReviewed(
  q: QuizQuestionLike,
  state: ReviewState,
  locale: Locale,
): boolean {
  const entry = state.entries[reviewKey(locale, q.id)];
  if (!entry) return false;
  if (entry.status !== 'approved' && entry.status !== 'edited') return false;
  return entry.reviewedHash === hashForEntry(q, entry);
}

/**
 * Compteur affiché par le quiz (art. 50 du règlement (UE) 2024/1689).
 *
 * Compté sur les questions du pool, jamais sur les entrées de l'état : cette
 * forme ne peut pas dépasser la taille du pool et tombe à zéro quand les hashs
 * ne correspondent plus. Un plafond `Math.min` ferait l'inverse, il rendrait
 * `questions.length` et ferait disparaître la mention.
 */
export function computeReviewedCount(
  questions: QuizQuestionLike[],
  state: ReviewState,
  locale: Locale,
): number {
  return questions.filter((q) => isReviewed(q, state, locale)).length;
}

// ─── Quotas ─────────────────────────────────────────────────────────────────

export const QUESTIONS_PER_DOMAIN = 2;
export const QUESTIONS_PER_DOSSIER = 1;

/** Dossiers assez fournis pour porter deux questions sans redite. */
export const RICH_DOSSIERS = new Set([
  'good-move', 'lez', 'metro-3', 'slrb', 'pfas', 'acs',
  'mobilite-partagee', 'data-centers-ia-energie', 'enseignement', 'petite-enfance',
]);

export interface UnitRef {
  type: 'domain' | 'dossier';
  slug: string;
}

export function quotaFor(unit: UnitRef): number {
  if (unit.type === 'domain') return QUESTIONS_PER_DOMAIN;
  return RICH_DOSSIERS.has(unit.slug) ? 2 : QUESTIONS_PER_DOSSIER;
}

/**
 * Une unité comptant moins de questions que son quota doit être régénérée.
 *
 * Sans cette règle, retirer une question ampute le pool de façon monotone et
 * silencieuse : `unitsToRegenerate` ne connaît que les sources modifiées, les
 * questions non estampillées et les unités entièrement vides.
 */
export function isUnderQuota(unit: UnitRef, questionCount: number): boolean {
  return questionCount < quotaFor(unit);
}
