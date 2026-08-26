import { describe, it, expect } from 'vitest';
import { applyDecisions, type Decision, type PoolsByLocale } from './quiz-review-apply';
import { hashQuestionV1, hashQuestionV2, type ReviewState } from './quiz-review';

function question(id: string, n = 0) {
  return {
    id,
    source: 'domain' as const,
    domain: 'Test',
    question: `Question ${n} ?`,
    options: ['a', 'b', 'c', 'd'],
    correct: 0,
    explanation: 'Parce que.',
    sourceSlug: '/fr/domaines/budget',
    sourceTitle: 'Budget',
  };
}

function pools(): PoolsByLocale {
  const build = (locale: 'fr' | 'nl' | 'en' | 'de') => ({
    generatedAt: '2026-08-01',
    locale,
    poolSize: 2,
    questionsPerSession: 10,
    reviewedCount: 0,
    questions: [question('domain-budget-0', 0), question('domain-budget-1', 1)],
  });
  return { fr: build('fr'), nl: build('nl'), en: build('en'), de: build('de') };
}

const EMPTY: ReviewState = { updatedAt: '2026-08-01', entries: {} };
const CTX = { now: '2026-08-25', reviewer: 'zoltan' };

describe('applyDecisions — approbation', () => {
  it('estampille en v2 et fait monter le compteur de la locale', () => {
    const decisions: Decision[] = [{ locale: 'fr', questionId: 'domain-budget-0', status: 'approved' }];
    const out = applyDecisions({ pools: pools(), state: EMPTY, decisions, ...CTX });

    const entry = out.state.entries['fr:domain-budget-0']!;
    expect(entry.status).toBe('approved');
    expect(entry.hashVersion).toBe(2);
    expect(entry.reviewedHash).toBe(hashQuestionV2(question('domain-budget-0', 0)));
    expect(entry.reviewedBy).toBe('zoltan');
    expect(out.pools.fr.reviewedCount).toBe(1);
    expect(out.counts).toEqual({ approved: 1, rejected: 0 });
  });

  it('ne touche pas les autres locales', () => {
    const out = applyDecisions({
      pools: pools(), state: EMPTY,
      decisions: [{ locale: 'fr', questionId: 'domain-budget-0', status: 'approved' }],
      ...CTX,
    });
    expect(out.pools.nl.reviewedCount).toBe(0);
    expect(out.state.entries['nl:domain-budget-0']).toBeUndefined();
  });
});

describe('applyDecisions — retrait', () => {
  const decisions: Decision[] = [
    { locale: 'fr', questionId: 'domain-budget-0', status: 'rejected', note: 'réponse fausse' },
  ];

  it('sort la question du pool servi', () => {
    const out = applyDecisions({ pools: pools(), state: EMPTY, decisions, ...CTX });
    expect(out.pools.fr.questions.map((q) => q.id)).toEqual(['domain-budget-1']);
  });

  it('met poolSize d’accord avec le nombre de questions', () => {
    const out = applyDecisions({ pools: pools(), state: EMPTY, decisions, ...CTX });
    expect(out.pools.fr.poolSize).toBe(1);
    expect(out.pools.fr.poolSize).toBe(out.pools.fr.questions.length);
  });

  it('garde la trace du retrait et sa note dans l’état', () => {
    const out = applyDecisions({ pools: pools(), state: EMPTY, decisions, ...CTX });
    const entry = out.state.entries['fr:domain-budget-0']!;
    expect(entry.status).toBe('rejected');
    expect(entry.note).toBe('réponse fausse');
  });

  it('ne compte jamais une question retirée comme relue', () => {
    const out = applyDecisions({ pools: pools(), state: EMPTY, decisions, ...CTX });
    expect(out.pools.fr.reviewedCount).toBe(0);
  });
});

describe('applyDecisions — recalcul des quatre locales', () => {
  /** Les deux régénérateurs CLI reconstruisent le pool sans le champ : une
   *  locale qu'on ne touche pas peut donc arriver avec un compteur faux. */
  it('répare un compteur périmé sur une locale non touchée', () => {
    const p = pools();
    p.de.reviewedCount = 999;
    const state: ReviewState = {
      updatedAt: '2026-08-01',
      entries: {
        'de:domain-budget-0': {
          status: 'approved', reviewedAt: '2026-08-01', reviewedBy: 'zoltan',
          reviewedHash: hashQuestionV1(question('domain-budget-0', 0)),
        },
      },
    };
    const out = applyDecisions({
      pools: p, state,
      decisions: [{ locale: 'fr', questionId: 'domain-budget-1', status: 'approved' }],
      ...CTX,
    });
    expect(out.pools.de.reviewedCount).toBe(1);
  });

  it('honore une entrée v1 sans la réécrire', () => {
    const state: ReviewState = {
      updatedAt: '2026-08-01',
      entries: {
        'fr:domain-budget-0': {
          status: 'approved', reviewedAt: '2026-08-06', reviewedBy: 'zoltan',
          reviewedHash: hashQuestionV1(question('domain-budget-0', 0)),
        },
      },
    };
    const out = applyDecisions({ pools: pools(), state, decisions: [], ...CTX });
    expect(out.pools.fr.reviewedCount).toBe(1);
    expect(out.state.entries['fr:domain-budget-0']!.hashVersion).toBeUndefined();
  });
});

describe('applyDecisions — refus', () => {
  it('rejette le lot entier si un identifiant est absent du pool', () => {
    expect(() =>
      applyDecisions({
        pools: pools(), state: EMPTY,
        decisions: [
          { locale: 'fr', questionId: 'domain-budget-0', status: 'approved' },
          { locale: 'fr', questionId: 'inexistante-9', status: 'approved' },
        ],
        ...CTX,
      }),
    ).toThrow(/inexistante-9/);
  });

  it('rejette deux décisions sur la même question', () => {
    expect(() =>
      applyDecisions({
        pools: pools(), state: EMPTY,
        decisions: [
          { locale: 'fr', questionId: 'domain-budget-0', status: 'approved' },
          { locale: 'fr', questionId: 'domain-budget-0', status: 'rejected' },
        ],
        ...CTX,
      }),
    ).toThrow(/deux fois/i);
  });

  it('ne mute pas les entrées reçues', () => {
    const p = pools();
    const before = JSON.stringify(p);
    applyDecisions({
      pools: p, state: EMPTY,
      decisions: [{ locale: 'fr', questionId: 'domain-budget-0', status: 'rejected' }],
      ...CTX,
    });
    expect(JSON.stringify(p)).toBe(before);
  });
});
