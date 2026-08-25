import { describe, it, expect } from 'vitest';
import { buildReviewQueue } from './quiz-review-queue';
import { hashQuestionV1, type ReviewState } from './quiz-review';
import type { PoolsByLocale } from './quiz-review-apply';

function q(id: string, suffix = '') {
  return {
    id,
    question: `Question ${id}${suffix} ?`,
    options: ['a', 'b', 'c', 'd'],
    correct: 0,
    explanation: 'Parce que.',
    sourceSlug: `/fr/domaines/budget`,
    sourceTitle: 'Budget',
    domain: 'Budget',
  };
}

function pools(overrides: Partial<Record<'fr' | 'nl' | 'en' | 'de', string[]>> = {}): PoolsByLocale {
  const ids = { fr: ['a-0', 'b-0'], nl: ['a-0', 'b-0'], en: ['a-0', 'b-0'], de: ['a-0', 'b-0'], ...overrides };
  const build = (locale: 'fr' | 'nl' | 'en' | 'de') => ({
    poolSize: ids[locale].length,
    questionsPerSession: 10,
    questions: ids[locale].map((id) => q(id, `-${locale}`)),
  });
  return { fr: build('fr'), nl: build('nl'), en: build('en'), de: build('de') };
}

const EMPTY: ReviewState = { updatedAt: '', entries: {} };

describe('buildReviewQueue', () => {
  it('groupe les langues d’une même question dans une seule carte', () => {
    const cards = buildReviewQueue(pools(), EMPTY);
    expect(cards).toHaveLength(2);
    expect(Object.keys(cards[0]!.blocks)).toEqual(['fr', 'nl', 'en', 'de']);
  });

  /** La parité n'est pas garantie : `dossier-foire-du-midi-0` n'existe qu'en
   *  français, et un retrait en fabrique d'autres. */
  it('gère une question qui n’existe que dans une langue', () => {
    const cards = buildReviewQueue(pools({ nl: ['a-0'], en: ['a-0'], de: ['a-0'] }), EMPTY);
    const orpheline = cards.find((c) => c.id === 'b-0')!;
    expect(Object.keys(orpheline.blocks)).toEqual(['fr']);
    expect(orpheline.missingLocales).toEqual(['nl', 'en', 'de']);
  });

  it('ne retient que les langues non relues', () => {
    const state: ReviewState = {
      updatedAt: '',
      entries: {
        'fr:a-0': {
          status: 'approved', reviewedAt: '2026-08-25', reviewedBy: 'zoltan',
          reviewedHash: hashQuestionV1(q('a-0', '-fr')),
        },
      },
    };
    const cards = buildReviewQueue(pools(), state);
    const carte = cards.find((c) => c.id === 'a-0')!;
    expect(Object.keys(carte.blocks)).toEqual(['nl', 'en', 'de']);
    expect(carte.reference?.locale).toBe('fr');
  });

  it('n’affiche pas de carte quand tout est relu', () => {
    const entries: ReviewState['entries'] = {};
    for (const l of ['fr', 'nl', 'en', 'de'] as const) {
      for (const id of ['a-0', 'b-0']) {
        entries[`${l}:${id}`] = {
          status: 'approved', reviewedAt: '', reviewedBy: '',
          reviewedHash: hashQuestionV1(q(id, `-${l}`)),
        };
      }
    }
    expect(buildReviewQueue(pools(), { updatedAt: '', entries })).toHaveLength(0);
  });

  /** L'état porte 68 entrées `edited` et 69 notes : les cacher ferait refaire
   *  à vide un raisonnement déjà tenu. */
  it('remonte la relecture précédente quand elle existe', () => {
    const state: ReviewState = {
      updatedAt: '',
      entries: {
        'fr:a-0': {
          status: 'edited', reviewedAt: '2026-08-06', reviewedBy: 'zoltan',
          reviewedHash: 'sha256:un-hash-perime', note: 'Référent ajouté.',
        },
      },
    };
    const carte = buildReviewQueue(pools(), state).find((c) => c.id === 'a-0')!;
    expect(carte.blocks.fr!.previous).toEqual({
      status: 'edited', reviewedAt: '2026-08-06', note: 'Référent ajouté.',
    });
  });

  it('expose la version française comme référence, même déjà relue', () => {
    const state: ReviewState = {
      updatedAt: '',
      entries: {
        'fr:a-0': {
          status: 'approved', reviewedAt: '', reviewedBy: '',
          reviewedHash: hashQuestionV1(q('a-0', '-fr')),
        },
      },
    };
    const carte = buildReviewQueue(pools(), state).find((c) => c.id === 'a-0')!;
    expect(carte.reference?.question).toContain('-fr');
  });

  it('compte ce qui reste, par langue', () => {
    const cards = buildReviewQueue(pools(), EMPTY);
    const total = cards.reduce((n, c) => n + Object.keys(c.blocks).length, 0);
    expect(total).toBe(8);
  });
});
