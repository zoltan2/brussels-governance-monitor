import { describe, it, expect } from 'vitest';
import {
  QUIZ_REVIEW_BRANCH_PREFIX,
  QUIZ_REVIEW_PATHS,
  poolPathFor,
  branchRefusal,
  prRefusal,
  fileSetRefusal,
  secondSessionRefusal,
  commitMessageFor,
  checkStateRefusal,
  shaRefusal,
  REVIEWER_LABEL,
} from './quiz-review-guards';

const REPO = 'zoltan2/brussels-governance-monitor';

describe('poolPathFor', () => {
  it('construit le chemin depuis une table, jamais par interpolation libre', () => {
    expect(poolPathFor('nl')).toBe('public/quiz-data-nl.json');
    expect(QUIZ_REVIEW_PATHS).toHaveLength(5);
  });
});

describe('branchRefusal', () => {
  it('accepte une branche de relecture', () => {
    expect(branchRefusal('review/quiz-2026-08-25')).toBeNull();
  });

  it('refuse une branche de veille', () => {
    expect(branchRefusal('content/veille-2026-08-24')).toMatch(/hors périmètre/i);
  });

  it('refuse un préfixe imité', () => {
    expect(branchRefusal('review/quiz')).not.toBeNull();
    expect(branchRefusal('feat/review/quiz-x')).not.toBeNull();
  });

  it('expose le préfixe attendu', () => {
    expect(QUIZ_REVIEW_BRANCH_PREFIX).toBe('review/quiz-');
  });
});

describe('prRefusal', () => {
  const ok = { branch: 'review/quiz-2026-08-25', headRepo: REPO, baseRef: 'main' };

  it('accepte une PR conforme', () => {
    expect(prRefusal(ok, REPO)).toBeNull();
  });

  /** La garde décisive : sur une PR ouverte depuis un fork, le nom de branche
   *  est choisi par l'auteur. */
  it('refuse une PR venue d’un fork', () => {
    expect(prRefusal({ ...ok, headRepo: 'inconnu/brussels-governance-monitor' }, REPO)).toMatch(
      /dépôt/i,
    );
  });

  it('refuse un fork supprimé, dont le dépôt d’origine est inconnu', () => {
    expect(prRefusal({ ...ok, headRepo: null }, REPO)).not.toBeNull();
  });

  it('refuse une PR qui ne vise pas main', () => {
    expect(prRefusal({ ...ok, baseRef: 'production' }, REPO)).toMatch(/base/i);
  });
});

describe('fileSetRefusal', () => {
  it('accepte les cinq chemins du quiz', () => {
    expect(fileSetRefusal([...QUIZ_REVIEW_PATHS])).toBeNull();
  });

  it('accepte un sous-ensemble', () => {
    expect(fileSetRefusal(['data/quiz-review-state.json', 'public/quiz-data-fr.json'])).toBeNull();
  });

  it('refuse le fichier qui pilote l’email des abonnés', () => {
    expect(fileSetRefusal(['data/pending-digest.json'])).toMatch(/hors périmètre/i);
  });

  it('refuse un pool d’une locale inexistante', () => {
    expect(fileSetRefusal(['public/quiz-data-it.json'])).not.toBeNull();
  });

  it('refuse une tentative de sortie de répertoire', () => {
    expect(fileSetRefusal(['public/../.github/workflows/deploy-image.yml'])).not.toBeNull();
  });

  it('refuse un lot mêlant un chemin licite et un illicite', () => {
    expect(fileSetRefusal(['public/quiz-data-fr.json', 'src/auth.ts'])).toMatch(/src\/auth\.ts/);
  });

  it('refuse un lot vide : une PR sans fichier n’a rien à fusionner', () => {
    expect(fileSetRefusal([])).not.toBeNull();
  });
});

describe('secondSessionRefusal', () => {
  /** Deux branches issues du même `main` réécrivent toutes deux le fichier
   *  d'état en entier : la seconde fusion casse sur un conflit, checks au vert,
   *  et la résolution manuelle évidente jette un lot de décisions humaines. */
  it('refuse d’ouvrir une seconde session quand une PR est ouverte', () => {
    const refusal = secondSessionRefusal([{ number: 412, branch: 'review/quiz-2026-08-25' }]);
    expect(refusal).toMatch(/412/);
  });

  it('laisse ouvrir quand aucune PR de relecture n’est en cours', () => {
    expect(secondSessionRefusal([])).toBeNull();
  });
});

describe('commitMessageFor', () => {
  it('décrit le lot avec des constantes et des compteurs', () => {
    const msg = commitMessageFor({ approved: 9, rejected: 3 });
    expect(msg).toContain('9');
    expect(msg).toContain('3');
  });

  /** Un `[skip ci]` glissé dans une note désactiverait les workflows en
   *  silence : la revue serait enregistrée et rien ne serait déployé. */
  it('ne laisse passer aucun texte de note', () => {
    const msg = commitMessageFor({
      approved: 1,
      rejected: 1,
      notes: ['[skip ci] et un saut\nCo-authored-by: quelquun <x@y.z>'],
    });
    expect(msg).not.toContain('skip ci');
    expect(msg).not.toContain('Co-authored-by: quelquun');
  });

  it('tient sur une seule ligne', () => {
    expect(commitMessageFor({ approved: 2, rejected: 0 }).split('\n')).toHaveLength(1);
  });
});

describe('checkStateRefusal', () => {
  const vert = { passed: 2, pending: 0, failed: [], total: 2 };

  it('laisse passer des contrôles tous verts', () => {
    expect(checkStateRefusal(vert)).toBeNull();
  });

  /** L’état nominal d’une PR dont aucun workflow n’est encore inscrit est
   *  zéro échec — que « aucun échec » lit comme un feu vert. */
  it('refuse une PR dont aucun contrôle n’a démarré', () => {
    expect(checkStateRefusal({ passed: 0, pending: 0, failed: [], total: 0 })).toBe(
      'Contrôles non démarrés',
    );
  });

  it('refuse tant qu’un contrôle est en cours', () => {
    expect(checkStateRefusal({ ...vert, pending: 1, total: 3 })).toBe('Contrôles en cours');
  });

  it('nomme les contrôles en échec', () => {
    expect(checkStateRefusal({ ...vert, failed: ['CI', 'Content lint'], total: 4 })).toBe(
      'Contrôles en échec : CI, Content lint',
    );
  });

  /** Un échec doit primer sur une attente : « en cours » invite à réessayer,
   *  alors que la PR est déjà condamnée. */
  it('signale l’échec plutôt que l’attente quand les deux sont vrais', () => {
    expect(checkStateRefusal({ ...vert, pending: 1, failed: ['CI'], total: 4 })).toBe(
      'Contrôles en échec : CI',
    );
  });
});

describe('shaRefusal', () => {
  const fichiers = [
    { path: 'data/quiz-review-state.json', sha: 'a'.repeat(40) },
    { path: 'public/quiz-data-fr.json', sha: 'b'.repeat(40) },
  ];
  const attendus = {
    'data/quiz-review-state.json': 'a'.repeat(40),
    'public/quiz-data-fr.json': 'b'.repeat(40),
  };

  it('laisse passer quand tous les sha correspondent', () => {
    expect(shaRefusal(fichiers, attendus)).toBeNull();
  });

  /** Le défaut : la garde était conditionnée à la présence de la clé, donc un
   *  corps sans `shas` la sautait entièrement et écrasait les pools sans que
   *  git ne voie de conflit — le commit est un descendant de main. */
  it('refuse un lot qui ne porte aucun sha de référence', () => {
    expect(shaRefusal(fichiers, {})).toEqual({
      error: 'Sha de référence manquant',
      files: ['data/quiz-review-state.json', 'public/quiz-data-fr.json'],
    });
  });

  it('refuse un sha absent même quand les autres correspondent', () => {
    const partiel = { 'data/quiz-review-state.json': attendus['data/quiz-review-state.json'] };
    expect(shaRefusal(fichiers, partiel)).toEqual({
      error: 'Sha de référence manquant',
      files: ['public/quiz-data-fr.json'],
    });
  });

  it('nomme le fichier dont le sha a bougé', () => {
    expect(shaRefusal(fichiers, { ...attendus, 'public/quiz-data-fr.json': 'c'.repeat(40) })).toEqual({
      error: 'Contenu modifié depuis le chargement',
      files: ['public/quiz-data-fr.json'],
    });
  });
});

describe('REVIEWER_LABEL', () => {
  /** `data/quiz-review-state.json` est versionné dans un dépôt PUBLIC : ce
   *  champ part dans l'historique git, définitivement. La route web y écrivait
   *  l'adresse de session. */
  it('ne contient pas d’adresse e-mail', () => {
    expect(REVIEWER_LABEL).not.toMatch(/@/);
    expect(REVIEWER_LABEL.length).toBeGreaterThan(0);
  });
});
