// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import {
  DELAI_INVITATION_MS,
  assainirPseudo,
  doitInviter,
  emailValide,
  encoderDefi,
  enregistrer,
  estStuutJour,
  etatTouches,
  evaluer,
  grilleDepuisEvals,
  lienInterne,
  lireStats,
  norm,
  statsVierges,
  texteDefi,
  texteResultat,
  type Verdict,
} from './stuut';

// Sorties produites le 18/09/2026 par le VRAI codec du jeu autonome
// (zoltan2/stuut, public/assets/defi-codec.mjs, commit 70f32e8), pas recalculées
// ici. Le lien de défi est lu par le jeu autonome : si le format dérive d'un
// côté ou de l'autre, un ami qui ouvre le lien tombe sur un défi illisible,
// sans erreur visible. Ces constantes sont le seul signal.
const GRILLE = '🟩⬛🟧⬛⬛⬛⬛\n🟩🟩🟩🟩🟩🟩🟩';
const DEFIS_REFERENCE = [
  { entree: { jour: '2026-09-18', n: 2, pseudo: 'Zoé', grid: GRILLE, variante: 1 }, code: 'MnxmemV8MnwxfFpvw6l8MjAxMDAwMAoyMjIyMjIy' },
  { entree: { jour: '2026-09-18', n: 0, pseudo: null, grid: GRILLE, variante: 0 }, code: 'MnxmemV8MHwwfHwyMDEwMDAwCjIyMjIyMjI' },
  { entree: { jour: '2026-07-16', n: 6, pseudo: 'Abscript', grid: '', variante: 2 }, code: 'MnxmeG18NnwyfEFic2NyaXB0fA' },
];

describe('Stuut : évaluation', () => {
  it('marque les lettres bien placées, présentes et absentes', () => {
    expect(evaluer('ORDRE', 'OSIER')).toEqual(['correct', 'present', 'absent', 'absent', 'present']);
  });

  it("ne compte une lettre présente qu'autant de fois qu'elle figure dans la solution", () => {
    // Deux E dans l'essai, un seul dans la solution, déjà bien placé : le second est absent.
    expect(evaluer('EEAAA', 'EBBBB')).toEqual(['correct', 'absent', 'absent', 'absent', 'absent']);
  });

  it('ignore les accents', () => {
    expect(norm('Mobilité')).toBe('MOBILITE');
    expect(norm('ÉCOLE')).toBe('ECOLE');
  });

  it('garde pour chaque touche le meilleur verdict obtenu', () => {
    const evals: Verdict[][] = [['present', 'absent'], ['correct', 'absent']];
    expect(etatTouches(['AB', 'AC'], evals)).toEqual({ A: 'correct', B: 'absent', C: 'absent' });
  });
});

describe('Stuut : compatibilité du lien de défi avec le jeu autonome', () => {
  it('produit la même grille emoji', () => {
    const evals: Verdict[][] = [
      ['correct', 'absent', 'present', 'absent', 'absent', 'absent', 'absent'],
      Array(7).fill('correct'),
    ];
    expect(grilleDepuisEvals(evals)).toBe(GRILLE);
  });

  it.each(DEFIS_REFERENCE)('encode comme le vrai codec ($code)', ({ entree, code }) => {
    expect(encoderDefi(entree)).toBe(code);
  });

  it('assainit le pseudo comme le jeu autonome', () => {
    expect(assainirPseudo('A|b<script>')).toBe('Abscript');
    expect(assainirPseudo('   ')).toBeNull();
    expect(assainirPseudo('x'.repeat(40))).toHaveLength(20);
  });

  it('reprend mot pour mot les accroches du jeu autonome', () => {
    const r = { day: 0, won: true, n: 2, grid: '🟩' };
    expect(texteDefi(r, 'U', 1)).toBe(
      "J'ai trouvé le mot du jour sur la gouvernance bruxelloise en 2 essais :\n🟩\nToi, tu tiens combien d'essais ? U",
    );
    expect(texteDefi({ ...r, won: false, n: 0 }, 'U', 0)).toBe(
      "Comme le Wordle, mais sur les coulisses de Bruxelles. Le mot du jour m'a résisté :\n🟩\nÀ toi de voir si tu fais mieux 👉 U",
    );
  });

  it('partage le résultat avec le numéro d’édition et un X en cas de défaite', () => {
    expect(texteResultat(95, { day: 94, won: false, n: 0, grid: '⬛' })).toBe(
      'Le Stuut du jour n°95 : X/6\n⬛\nhttps://stuut.governance.brussels',
    );
  });
});

describe('Stuut : statistiques', () => {
  const gagne = (day: number, n = 3) => ({ day, won: true, n, grid: '' });

  it('ne compte une journée qu’une fois', () => {
    const une = enregistrer(statsVierges(), gagne(10));
    const deux = enregistrer(une, gagne(10));
    expect(deux.played).toBe(1);
    expect(deux.dist[2]).toBe(1);
  });

  it('prolonge la série sur des jours consécutifs, la casse sur un jour sauté', () => {
    let s = enregistrer(statsVierges(), gagne(10));
    s = enregistrer(s, gagne(11));
    expect(s.streak).toBe(2);
    s = enregistrer(s, gagne(13));
    expect(s.streak).toBe(1);
    expect(s.max).toBe(2);
  });

  it('remet la série à zéro sur une défaite', () => {
    let s = enregistrer(statsVierges(), gagne(10));
    s = enregistrer(s, { day: 11, won: false, n: 0, grid: '' });
    expect(s.streak).toBe(0);
    expect(s.wins).toBe(1);
    expect(s.played).toBe(2);
  });

  it('repart de zéro sur une valeur corrompue', () => {
    expect(lireStats('{pas du json')).toEqual(statsVierges());
    expect(lireStats('{"dist":[1]}')).toEqual(statsVierges());
    expect(lireStats(null)).toEqual(statsVierges());
  });
});

describe('Stuut : inscription par e-mail', () => {
  it("accepte une adresse ordinaire et refuse ce qui n'en est pas une", () => {
    expect(emailValide('lecteur@exemple.be')).toBe(true);
    for (const v of ['', 'sans-arobase', 'a@b', 'a b@c.be', '<a@b.be>', `${'x'.repeat(250)}@b.be`]) {
      expect(emailValide(v), v).toBe(false);
    }
  });

  it("n'invite jamais un appareil inscrit, et une fois tous les trois jours au plus", () => {
    const maintenant = 10 * 86_400_000;
    expect(doitInviter({ inscrit: true, derniereInvitation: null, maintenant })).toBe(false);
    expect(doitInviter({ inscrit: false, derniereInvitation: null, maintenant })).toBe(true);
    expect(doitInviter({ inscrit: false, derniereInvitation: maintenant - 86_400_000, maintenant })).toBe(false);
    expect(doitInviter({ inscrit: false, derniereInvitation: maintenant - DELAI_INVITATION_MS, maintenant })).toBe(true);
    // Une valeur corrompue dans le stockage n'empêche pas l'invitation pour toujours.
    expect(doitInviter({ inscrit: false, derniereInvitation: Number.NaN, maintenant })).toBe(true);
  });
});

describe('Stuut : réponse de /api/jour', () => {
  const valide = {
    jour: '2026-09-18',
    numero: 95,
    mot: 'ORDONNANCE',
    definition: 'd',
    url: 'https://governance.brussels/fr/glossaire#ordonnance',
    appat: null,
  };

  it('accepte une réponse bien formée', () => {
    expect(estStuutJour(valide)).toBe(true);
  });

  it.each([
    ['vide', {}],
    ['sans mot', { ...valide, mot: '' }],
    ['mot piégé', { ...valide, mot: '<img src=x>' }],
    ['numéro non entier', { ...valide, numero: 1.5 }],
    ['réponse du panneau de test', { questions: [] }],
  ])('refuse une réponse %s', (_nom, v) => {
    expect(estStuutJour(v)).toBe(false);
  });

  it('rend relatif un lien vers ce site, et laisse un lien externe intact', () => {
    expect(lienInterne('https://governance.brussels/fr/glossaire#ordonnance')).toBe('/fr/glossaire#ordonnance');
    expect(lienInterne('https://exemple.be/x')).toBe('https://exemple.be/x');
  });
});
