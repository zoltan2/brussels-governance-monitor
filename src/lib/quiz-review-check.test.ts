import { describe, it, expect } from 'vitest';
import { findCountDivergences } from './quiz-review-check';
import { hashQuestionV1, type ReviewState } from './quiz-review';
import type { PoolsByLocale } from './quiz-review-apply';

const q = {
  id: 'a-0',
  question: 'Question ?',
  options: ['a', 'b', 'c', 'd'],
  correct: 0,
  explanation: 'Parce que.',
};

function pools(reviewedCount: number | undefined, poolSize = 1): PoolsByLocale {
  const build = () => ({ poolSize, reviewedCount, questions: [q] });
  return { fr: build(), nl: build(), en: build(), de: build() };
}

const RELUE: ReviewState = {
  updatedAt: '',
  entries: Object.fromEntries(
    ['fr', 'nl', 'en', 'de'].map((l) => [
      `${l}:a-0`,
      { status: 'approved', reviewedAt: '', reviewedBy: '', reviewedHash: hashQuestionV1(q) },
    ]),
  ),
};

describe('findCountDivergences', () => {
  it('ne dit rien quand tout concorde', () => {
    expect(findCountDivergences(pools(1), RELUE)).toEqual([]);
  });

  /** Le scénario redouté : un compteur gonflé fait disparaître la mention sur
   *  des questions que personne n'a relues. */
  it('attrape un compteur plus haut que la réalité', () => {
    const found = findCountDivergences(pools(1), { updatedAt: '', entries: {} });
    expect(found).toHaveLength(4);
    expect(found[0]).toMatchObject({ declared: 1, actual: 0, reason: 'reviewedCount' });
  });

  it('attrape un compteur absent alors que des relectures existent', () => {
    expect(findCountDivergences(pools(undefined), RELUE)).toHaveLength(4);
  });

  it('attrape un poolSize qui ne suit plus le nombre de questions', () => {
    const found = findCountDivergences(pools(1, 68), RELUE);
    expect(found.every((d) => d.reason === 'poolSize')).toBe(true);
    expect(found).toHaveLength(4);
  });
});
