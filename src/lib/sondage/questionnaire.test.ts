// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import {
  etapeDeReprise,
  etapePrecedente,
  obligatoireManquante,
  OPTIONS,
  parcours,
  Q5_NOMS,
  Q5_NOMS_PAR_LANGUE,
  telephoneValide,
} from './questionnaire';
import { TEXTES } from './textes';

describe('parcours', () => {
  it('lecteur régulier sans Q4 : 10 écrans', () => {
    expect(parcours({ q1: { valeur: 'souvent' } })).toEqual([
      'q1', 'q2', 'q3', 'q4', 'q5', 'q6a', 'q6b', 'q7', 'q8', 'q9',
    ]);
  });

  it('avec Q4 : 11 écrans, Q4a ou Q4b', () => {
    expect(parcours({ q1: { valeur: 'parfois' }, q4: { valeur: 'souvent' } })).toContain('q4a');
    expect(parcours({ q1: { valeur: 'parfois' }, q4: { valeur: 'rarement' } })).toContain('q4b');
    expect(parcours({ q1: { valeur: 'parfois' }, q4: { valeur: 'jamais' } })).toHaveLength(11);
  });

  it('Q1 « jamais » : Q1b puis Q7, Q8, Q9', () => {
    expect(parcours({ q1: { valeur: 'jamais' } })).toEqual(['q1', 'q1b', 'q7', 'q8', 'q9']);
  });

  it('Précédent et reprise suivent le parcours réel', () => {
    const r = { q1: { valeur: 'rarement' } };
    expect(etapePrecedente(r, 'q7')).toBe('q1b');
    expect(etapeDeReprise(r, 'q1b')).toBe('q7');
    expect(etapeDeReprise({}, 'accueil')).toBe('q1');
  });

  it('Q2 n’est obligatoire que sur le parcours qui la contient', () => {
    expect(obligatoireManquante({ q1: { valeur: 'souvent' } })).toBe('q2');
    expect(obligatoireManquante({ q1: { valeur: 'jamais' } })).toBeNull();
    expect(obligatoireManquante({})).toBe('q1');
  });
});

describe('textes', () => {
  it.each(['fr', 'nl'] as const)('%s : un libellé pour chaque valeur autorisée', (langue) => {
    const t = TEXTES[langue];
    for (const [etape, valeurs] of Object.entries(OPTIONS)) {
      const libelles = t.questions[etape as keyof typeof OPTIONS].options;
      expect(Object.keys(libelles).sort()).toEqual([...valeurs].sort());
      for (const v of valeurs) expect(libelles[v]).toBeTruthy();
    }
    for (const nom of Q5_NOMS_PAR_LANGUE[langue]) expect(t.q5Noms[nom]).toBeTruthy();
    // Pas de libellé pour un nom que la langue ne propose pas.
    expect(Object.keys(t.q5Noms).sort()).toEqual([...Q5_NOMS_PAR_LANGUE[langue]].sort());
  });

  it('Q5 : la liste française garde les sept noms ; la néerlandaise, ni Stuut ni Signal', () => {
    expect(Q5_NOMS_PAR_LANGUE.fr).toEqual(Q5_NOMS);
    expect(Q5_NOMS_PAR_LANGUE.nl).toEqual(['magazine', 'amai', 'quiz', 'question_du_jour', 'radar']);
    expect(Object.values(TEXTES.nl.q5Noms)).toEqual([
      'Het magazine',
      'Amai !',
      'De quiz',
      'De vraag van de dag',
      'De radar',
    ]);
  });

  it('Q9 : texte validé le 30/09/2026', () => {
    expect(TEXTES.fr.questions.q9.question).toBe(
      'Accepteriez-vous un échange de quinze minutes, par téléphone ou en visio ? Zoltán Jánosi, qui édite BGM, vous contactera pour fixer un moment. Aucune sollicitation commerciale.',
    );
    expect(TEXTES.nl.questions.q9.question).toContain(
      'Zoltán Jánosi, die BGM uitgeeft, neemt contact met u op om een moment af te spreken. Zonder enig commercieel oogmerk.',
    );
    for (const l of ['fr', 'nl'] as const) expect(TEXTES[l].q9Aide).toMatch(/6 (décembre|december) 2026/);
  });

  it('aucun libellé ne contient « envoyé en » ni de tiret cadratin', () => {
    const tout = JSON.stringify(TEXTES) + TEXTES.fr.accueilParagraphe1(7) + TEXTES.nl.accueilParagraphe1(7);
    expect(tout).not.toMatch(/envoyé en|—/);
  });

  it('sans durée mesurée, l’accueil n’annonce aucun chiffre', () => {
    expect(TEXTES.fr.accueilParagraphe1(null)).not.toMatch(/Environ/);
    expect(TEXTES.fr.accueilParagraphe1(6)).toMatch(/Environ 6 minutes\.$/);
  });
});

describe('telephoneValide (souple)', () => {
  it.each(['0470 12 34 56', '+32 470 12 34 56', '02.123.45.67', '0470-12-34-56', '+32470123456', '12345678'])(
    'accepte « %s »',
    (t) => expect(telephoneValide(t)).toBe(true),
  );

  it.each([
    ['trop court (7 chiffres)', '1234567'],
    ['trop long (21 chiffres)', '1'.repeat(21)],
    ['lettres', '0470 ABC 456'],
    ['parenthèses', '(02) 123 45 67'],
    ['« + » ailleurs qu’en tête', '0032+470123456'],
    ['vide', ''],
    ['séparateurs seuls', '+ . - . - . -'],
  ])('refuse : %s', (_, t) => expect(telephoneValide(t)).toBe(false));
});
