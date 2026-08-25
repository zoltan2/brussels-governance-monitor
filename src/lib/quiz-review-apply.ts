// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Application d'un lot de décisions de relecture.
 *
 * Fonction pure : elle reçoit les quatre pools et l'état, elle en rend des
 * copies modifiées. Aucun accès réseau, aucun accès disque, aucune dépendance
 * à la chaîne d'authentification — sans quoi ses tests n'exécuteraient rien.
 *
 * Deux invariants que le reste du dispositif suppose :
 *
 * 1. Le compteur des QUATRE locales est recalculé à chaque lot, pas seulement
 *    celui des locales touchées. Les deux régénérateurs CLI reconstruisent le
 *    pool sans le champ `reviewedCount` : une locale laissée de côté garde
 *    sinon une valeur périmée, et la mention de l'article 50 se trompe.
 * 2. Un identifiant inconnu fait rejeter le LOT ENTIER. Appliquer à moitié un
 *    lot de douze décisions humaines laisserait un état que personne ne peut
 *    reconstituer.
 */

import {
  LOCALES,
  computeReviewedCount,
  hashQuestionV2,
  reviewKey,
  CURRENT_HASH_VERSION,
  type Locale,
  type ReviewEntry,
  type ReviewState,
} from './quiz-review';

export interface PoolQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  [key: string]: unknown;
}

export interface Pool {
  poolSize: number;
  reviewedCount?: number;
  questions: PoolQuestion[];
  [key: string]: unknown;
}

export type PoolsByLocale = Record<Locale, Pool>;

export interface Decision {
  locale: Locale;
  questionId: string;
  /** `approved` : la question reste servie. `rejected` : elle sort du quiz. */
  status: 'approved' | 'rejected';
  note?: string;
}

export interface ApplyResult {
  pools: PoolsByLocale;
  state: ReviewState;
  counts: { approved: number; rejected: number };
}

export function applyDecisions(params: {
  pools: PoolsByLocale;
  state: ReviewState;
  decisions: Decision[];
  now: string;
  reviewer: string;
}): ApplyResult {
  const { decisions, now, reviewer } = params;

  // Copies : l'appelant garde ses objets intacts, ce qui rend un échec en
  // cours de lot sans conséquence.
  const pools = JSON.parse(JSON.stringify(params.pools)) as PoolsByLocale;
  const entries: Record<string, ReviewEntry> = { ...params.state.entries };

  const seen = new Set<string>();
  for (const d of decisions) {
    const key = reviewKey(d.locale, d.questionId);
    if (seen.has(key)) {
      throw new Error(`Question décidée deux fois dans le même lot : ${key}`);
    }
    seen.add(key);

    const pool = pools[d.locale];
    const question = pool.questions.find((q) => q.id === d.questionId);
    if (!question) {
      throw new Error(
        `Question absente du pool ${d.locale} : ${d.questionId}. Lot entier refusé.`,
      );
    }

    const entry: ReviewEntry = {
      status: d.status,
      reviewedAt: now,
      reviewedBy: reviewer,
      reviewedHash: hashQuestionV2(question),
      hashVersion: CURRENT_HASH_VERSION,
    };
    if (d.note) entry.note = d.note;
    entries[key] = entry;

    if (d.status === 'rejected') {
      // Une question jugée fausse cesse d'être posée immédiatement. La trace
      // du retrait et sa note restent dans l'état ; l'unité passe sous son
      // quota et `unitsToRegenerate` la reprendra au tour suivant.
      pool.questions = pool.questions.filter((q) => q.id !== d.questionId);
    }
  }

  const state: ReviewState = { updatedAt: now, entries };

  for (const locale of LOCALES) {
    const pool = pools[locale];
    pool.poolSize = pool.questions.length;
    pool.reviewedCount = computeReviewedCount(pool.questions, state, locale);
  }

  return {
    pools,
    state,
    counts: {
      approved: decisions.filter((d) => d.status === 'approved').length,
      rejected: decisions.filter((d) => d.status === 'rejected').length,
    },
  };
}
