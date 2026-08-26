// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Contrôle du compteur de relecture.
 *
 * `reviewedCount` est le SEUL signal qui décide de l'affichage de la mention
 * de l'article 50 du règlement (UE) 2024/1689 — et rien ne le vérifiait :
 * `quiz-lint.ts` n'ouvre jamais l'état de relecture, et `ci.yml` non plus. Une
 * valeur trop haute fait disparaître la mention sur des questions jamais
 * relues, sans qu'aucun contrôle ne rougisse.
 *
 * Trois chemins peuvent produire une valeur fausse : un conflit résolu à la
 * main sur github.com, un push direct de `refresh-quiz.yml`, une édition
 * manuelle. Ce module les rattrape tous, en recalculant depuis la source.
 */

import { LOCALES, computeReviewedCount, type Locale, type ReviewState } from './quiz-review';
import type { PoolsByLocale } from './quiz-review-apply';

export interface CountDivergence {
  locale: Locale;
  declared: number | undefined;
  actual: number;
  reason: 'reviewedCount' | 'poolSize';
}

export function findCountDivergences(
  pools: PoolsByLocale,
  state: ReviewState,
): CountDivergence[] {
  const out: CountDivergence[] = [];
  for (const locale of LOCALES) {
    const pool = pools[locale];
    const actual = computeReviewedCount(pool.questions, state, locale);
    if ((pool.reviewedCount ?? 0) !== actual) {
      out.push({ locale, declared: pool.reviewedCount, actual, reason: 'reviewedCount' });
    }
    if (pool.poolSize !== pool.questions.length) {
      out.push({
        locale,
        declared: pool.poolSize,
        actual: pool.questions.length,
        reason: 'poolSize',
      });
    }
  }
  return out;
}
