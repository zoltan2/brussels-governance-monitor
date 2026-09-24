// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { lireCelluleStatbel } from './statbel';

describe('lireCelluleStatbel', () => {
  it('nombre brut', () => expect(lireCelluleStatbel(0.328)).toEqual({ valeur: 0.328, statut: 'ok' }));
  it('pourcentage texte avec réserve (1)', () =>
    expect(lireCelluleStatbel('17,6%⁽¹⁾')).toEqual({ valeur: 17.6, statut: 'prudence' }));
  it('pourcentage texte sans réserve', () => expect(lireCelluleStatbel('32,8 %')).toEqual({ valeur: 32.8, statut: 'ok' }));
  it('non disponible (2)', () => expect(lireCelluleStatbel('⁽²⁾')).toEqual({ valeur: null, statut: 'indisponible' }));
  it('case vide', () => expect(lireCelluleStatbel(null)).toEqual({ valeur: null, statut: 'indisponible' }));
  it('texte inconnu : échec, jamais de valeur inventée', () => expect(() => lireCelluleStatbel('n.d.')).toThrow(/n\.d\./));
});
