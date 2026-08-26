import { describe, it, expect } from 'vitest';
import {
  hashQuestionV1,
  hashQuestionV2,
  hashForEntry,
  isReviewed,
  computeReviewedCount,
  quotaFor,
  isUnderQuota,
  reviewKey,
  type QuizQuestionLike,
  type ReviewState,
} from './quiz-review';

const BASE: QuizQuestionLike = {
  id: 'vector',
  question: 'Combien de communes compte la Région de Bruxelles-Capitale ?',
  options: ['Dix-neuf', 'Six', 'Vingt-deux', 'Neuf'],
  correct: 0,
  explanation:
    'Les dix-neuf communes forment l’arrondissement administratif de Bruxelles-Capitale.',
};

function state(entries: ReviewState['entries']): ReviewState {
  return { updatedAt: '2026-08-25', entries };
}

describe('hashQuestionV1', () => {
  /** Vecteur figé : l'algorithme v1 est celui qui a estampillé les 269 entrées
   *  existantes. S'il bouge, toutes les relectures retombent en silence. */
  it('reproduit le hash de référence', () => {
    expect(hashQuestionV1(BASE)).toBe('sha256:9d919df3a01f26d92e5ae9924daaacc1');
  });

  it('ignore le corrigé — c’est précisément son défaut', () => {
    expect(hashQuestionV1({ ...BASE, correct: 2 })).toBe(hashQuestionV1(BASE));
  });

  it('sépare les champs autrement que par une espace', () => {
    const a = { ...BASE, question: 'a b', options: ['c', 'd', 'e', 'f'], explanation: 'g' };
    const b = { ...BASE, question: 'a', options: ['b c', 'd', 'e', 'f'], explanation: 'g' };
    expect(hashQuestionV1(a)).not.toBe(hashQuestionV1(b));
  });
});

describe('hashQuestionV2', () => {
  it('change quand le corrigé change', () => {
    expect(hashQuestionV2({ ...BASE, correct: 2 })).not.toBe(hashQuestionV2(BASE));
  });

  it('diffère du v1 sur la même question', () => {
    expect(hashQuestionV2(BASE)).not.toBe(hashQuestionV1(BASE));
  });
});

describe('hashForEntry', () => {
  it('traite une entrée sans hashVersion en v1', () => {
    const entry = { status: 'approved' as const, reviewedAt: '', reviewedBy: '', reviewedHash: '' };
    expect(hashForEntry(BASE, entry)).toBe(hashQuestionV1(BASE));
  });

  it('utilise le v2 quand l’entrée le déclare', () => {
    const entry = {
      status: 'approved' as const, reviewedAt: '', reviewedBy: '', reviewedHash: '', hashVersion: 2 as const,
    };
    expect(hashForEntry(BASE, entry)).toBe(hashQuestionV2(BASE));
  });
});

describe('isReviewed', () => {
  const approved = state({
    'fr:vector': {
      status: 'approved', reviewedAt: '2026-08-25', reviewedBy: 'zoltan',
      reviewedHash: hashQuestionV1(BASE),
    },
  });

  it('reconnaît une question approuvée dont le texte n’a pas changé', () => {
    expect(isReviewed(BASE, approved, 'fr')).toBe(true);
  });

  it('retombe en attente quand le texte a changé', () => {
    expect(isReviewed({ ...BASE, question: 'autre chose ?' }, approved, 'fr')).toBe(false);
  });

  it('ne compte jamais une question retirée du quiz', () => {
    const rejected = state({
      'fr:vector': {
        status: 'rejected', reviewedAt: '2026-08-25', reviewedBy: 'zoltan',
        reviewedHash: hashQuestionV1(BASE), note: 'réponse fausse',
      },
    });
    expect(isReviewed(BASE, rejected, 'fr')).toBe(false);
  });

  it('compte une entrée `edited`, trace d’une correction déjà appliquée', () => {
    const edited = state({
      'fr:vector': {
        status: 'edited', reviewedAt: '2026-08-06', reviewedBy: 'zoltan',
        reviewedHash: hashQuestionV1(BASE),
      },
    });
    expect(isReviewed(BASE, edited, 'fr')).toBe(true);
  });

  it('n’attribue pas à une locale la relecture d’une autre', () => {
    expect(isReviewed(BASE, approved, 'nl')).toBe(false);
    expect(reviewKey('nl', 'vector')).toBe('nl:vector');
  });

  it('détecte un corrigé déplacé quand l’entrée est en v2', () => {
    const v2 = state({
      'fr:vector': {
        status: 'approved', reviewedAt: '2026-08-25', reviewedBy: 'zoltan',
        reviewedHash: hashQuestionV2(BASE), hashVersion: 2,
      },
    });
    expect(isReviewed(BASE, v2, 'fr')).toBe(true);
    expect(isReviewed({ ...BASE, correct: 3 }, v2, 'fr')).toBe(false);
  });
});

describe('computeReviewedCount', () => {
  const questions = [BASE, { ...BASE, id: 'autre', question: 'Deuxième question ?' }];

  it('compte les questions réellement relues', () => {
    const s = state({
      'fr:vector': {
        status: 'approved', reviewedAt: '', reviewedBy: '', reviewedHash: hashQuestionV1(BASE),
      },
    });
    expect(computeReviewedCount(questions, s, 'fr')).toBe(1);
  });

  /** Le plafond n'est pas un `Math.min` : la forme même du calcul interdit le
   *  débordement, y compris quand l'état porte des entrées orphelines. */
  it('ne dépasse jamais la taille du pool, même avec des entrées orphelines', () => {
    const entries: ReviewState['entries'] = {};
    for (let i = 0; i < 50; i++) {
      entries[`fr:fantome-${i}`] = {
        status: 'approved', reviewedAt: '', reviewedBy: '', reviewedHash: 'sha256:peu-importe',
      };
    }
    expect(computeReviewedCount(questions, state(entries), 'fr')).toBe(0);
  });
});

describe('quotaFor', () => {
  it('donne deux questions à une carte domaine', () => {
    expect(quotaFor({ type: 'domain', slug: 'budget' })).toBe(2);
  });

  it('donne une question à un dossier ordinaire', () => {
    expect(quotaFor({ type: 'dossier', slug: 'vice-gouverneur' })).toBe(1);
  });

  it('donne deux questions à un dossier riche', () => {
    expect(quotaFor({ type: 'dossier', slug: 'mobilite-partagee' })).toBe(2);
  });
});

describe('isUnderQuota', () => {
  /** Sans cette règle, retirer une question du quiz ampute le pool sans
   *  qu'aucune régénération ne la remplace : `unitsToRegenerate` ne connaît
   *  que les sources modifiées et les unités vides. */
  it('signale une unité amputée', () => {
    expect(isUnderQuota({ type: 'domain', slug: 'budget' }, 1)).toBe(true);
  });

  it('laisse tranquille une unité complète', () => {
    expect(isUnderQuota({ type: 'domain', slug: 'budget' }, 2)).toBe(false);
  });

  it('ne se déclenche pas sur un surplus', () => {
    expect(isUnderQuota({ type: 'dossier', slug: 'vice-gouverneur' }, 3)).toBe(false);
  });
});
