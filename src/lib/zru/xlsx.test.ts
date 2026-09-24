// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lireFeuille } from './xlsx';

const buf = readFileSync(join(process.cwd(), 'src/lib/zru/__fixtures__/mini.xlsx'));
const bufBadCell = readFileSync(join(process.cwd(), 'src/lib/zru/__fixtures__/bad-cell.xlsx'));

describe('lireFeuille', () => {
  it('lit chaînes partagées, nombres, texte enrichi et chaînes en ligne, cases vides = null', () => {
    const rows = lireFeuille(buf, 1);
    expect(rows[0]).toEqual(['Code', 'Commune']);
    expect(rows[1]).toEqual([21005, 'Etterbeek', '17,6%⁽¹⁾']);
    expect(rows[2]).toEqual([21009, 'Ixelles', null, '⁽²⁾', 'texte']);
  });
  it('indexe les lignes par leur attribut r, pas par ordre physique', () => {
    const rows = lireFeuille(buf, 1);
    expect(rows[3]).toEqual([]);  // row 4 absent
    expect(rows[4]).toEqual([null, 'StyleCell']);  // row 5 avec s avant r
  });
  it('gère les lignes self-closing', () => {
    const rows = lireFeuille(buf, 1);
    expect(rows[5]).toEqual([]);  // row 6 self-closing
  });
  it('lit une cellule avec attribut s avant r', () => {
    const rows = lireFeuille(buf, 1);
    expect(rows[4][1]).toBe('StyleCell');
  });
  it('échoue clairement sur une feuille absente', () => {
    expect(() => lireFeuille(buf, 7)).toThrow(/feuille 7/);
  });
  it('échoue sur une cellule sans attribut r', () => {
    expect(() => lireFeuille(bufBadCell, 1)).toThrow(/cellule sans attribut r/);
  });
});
