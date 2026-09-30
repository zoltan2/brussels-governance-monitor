// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { etapeDeReprise, etapePrecedente, obligatoireManquante, OPTIONS, parcours, Q5_NOMS } from './questionnaire';
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
    for (const nom of Q5_NOMS) expect(t.q5Noms[nom]).toBeTruthy();
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
