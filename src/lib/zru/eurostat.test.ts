// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { valeur, valeurRequise, derniereMiseAJour, type JsonStat } from './eurostat';

// Jeu creux : DE30 manque en 2020 (réponse réelle observée le 24/09/2026).
const ds: JsonStat = {
  id: ['freq', 'unit', 'geo', 'time'],
  size: [1, 1, 3, 2],
  dimension: {
    freq: { category: { index: { A: 0 } } },
    unit: { category: { index: { PC: 0 } } },
    geo: { category: { index: { BE10: 0, AT13: 1, DE30: 2 } } },
    time: { category: { index: { '2020': 0, '2025': 1 } } },
  },
  value: { '0': 28.2, '1': 23.3, '2': 24.1, '3': 25.7, '5': 18.7 },
  updated: '2026-09-17T23:00:00+0200',
};

describe('décodage Eurostat', () => {
  it('lit une valeur par index de dimension', () => {
    expect(valeur(ds, { geo: 'AT13', time: '2025' })).toBe(25.7);
    expect(valeur(ds, { geo: 'BE10', time: '2020' })).toBe(28.2);
  });
  it('rend null pour une valeur absente, sans décaler les autres', () => {
    expect(valeur(ds, { geo: 'DE30', time: '2020' })).toBeNull();
    expect(valeur(ds, { geo: 'DE30', time: '2025' })).toBe(18.7);
  });
  it('valeurRequise échoue sur une valeur absente en nommant les coordonnées', () => {
    expect(() => valeurRequise(ds, { geo: 'DE30', time: '2020' })).toThrow(/DE30.*2020/);
  });
  it('échoue sur une modalité inconnue plutôt que de rendre 0', () => {
    expect(() => valeur(ds, { geo: 'FR10', time: '2025' })).toThrow(/geo.*FR10/);
  });
  it('accepte un index de catégorie sous forme de tableau et des valeurs en tableau', () => {
    const arr: JsonStat = { ...ds, dimension: { ...ds.dimension, geo: { category: { index: ['BE10', 'AT13', 'DE30'] } } }, value: [28.2, 23.3, 24.1, 25.7, null, 18.7] };
    expect(valeur(arr, { geo: 'AT13', time: '2025' })).toBe(25.7);
    expect(valeur(arr, { geo: 'DE30', time: '2020' })).toBeNull();
  });
  it('extrait la date de mise à jour', () => {
    expect(derniereMiseAJour(ds)).toBe('2026-09-17');
    expect(derniereMiseAJour({ ...ds, updated: undefined })).toBeNull();
  });
});
