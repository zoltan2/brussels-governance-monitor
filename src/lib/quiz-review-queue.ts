// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Construction de la file de relecture, pour l'affichage.
 *
 * Une carte = une question, toutes langues confondues. Découper par langue
 * ferait juger quatre fois la même question à des moments éloignés, sans
 * pouvoir la comparer à la version française qui fait référence.
 *
 * La parité entre langues n'est pas garantie : `dossier-foire-du-midi-0`
 * n'existe qu'en français, et un retrait en fabrique d'autres. Une carte porte
 * donc de une à quatre langues, et nomme celles qui manquent.
 *
 * Module pur : le composant client ne reçoit que ce que cette fonction a
 * calculé côté serveur, jamais une fonction de hash.
 */

import { LOCALES, isReviewed, type Locale, type ReviewState } from './quiz-review';
import type { PoolsByLocale, PoolQuestion } from './quiz-review-apply';

export interface PreviousReview {
  status: string;
  reviewedAt: string;
  note?: string;
}

export interface QuestionBlock {
  locale: Locale;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  sourceSlug?: string;
  sourceTitle?: string;
  /** Relecture antérieure, si la question en a déjà connu une. */
  previous?: PreviousReview;
}

export interface ReviewCard {
  id: string;
  /** Version française, montrée en tête même si elle est déjà relue : c'est
   *  elle qui sert de référence pour juger les traductions. */
  reference?: QuestionBlock;
  /** Langues restant à relire, dans l'ordre fr, nl, en, de. */
  blocks: Partial<Record<Locale, QuestionBlock>>;
  missingLocales: Locale[];
}

function toBlock(
  locale: Locale,
  q: PoolQuestion,
  state: ReviewState,
): QuestionBlock {
  const entry = state.entries[`${locale}:${q.id}`];
  return {
    locale,
    question: q.question,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
    sourceSlug: typeof q.sourceSlug === 'string' ? q.sourceSlug : undefined,
    sourceTitle: typeof q.sourceTitle === 'string' ? q.sourceTitle : undefined,
    previous: entry
      ? { status: entry.status, reviewedAt: entry.reviewedAt, note: entry.note }
      : undefined,
  };
}

export function buildReviewQueue(
  pools: PoolsByLocale,
  state: ReviewState,
): ReviewCard[] {
  const byId = new Map<string, Partial<Record<Locale, PoolQuestion>>>();
  for (const locale of LOCALES) {
    for (const q of pools[locale].questions) {
      const entry = byId.get(q.id) ?? {};
      entry[locale] = q;
      byId.set(q.id, entry);
    }
  }

  const cards: ReviewCard[] = [];
  for (const [id, versions] of byId) {
    const blocks: Partial<Record<Locale, QuestionBlock>> = {};
    for (const locale of LOCALES) {
      const q = versions[locale];
      if (!q) continue;
      if (isReviewed(q, state, locale)) continue;
      blocks[locale] = toBlock(locale, q, state);
    }
    if (Object.keys(blocks).length === 0) continue;

    const fr = versions.fr;
    cards.push({
      id,
      reference: fr ? toBlock('fr', fr, state) : undefined,
      blocks,
      missingLocales: LOCALES.filter((l) => !versions[l]),
    });
  }

  return cards;
}

/** Nombre de décisions restant à prendre, par langue. */
export function pendingByLocale(cards: ReviewCard[]): Record<Locale, number> {
  const out = { fr: 0, nl: 0, en: 0, de: 0 };
  for (const card of cards) {
    for (const locale of LOCALES) {
      if (card.blocks[locale]) out[locale] += 1;
    }
  }
  return out;
}
