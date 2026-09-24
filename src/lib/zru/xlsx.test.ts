// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lireFeuille } from './xlsx';

const buf = readFileSync(join(process.cwd(), 'src/lib/zru/__fixtures__/mini.xlsx'));

describe('lireFeuille', () => {
  it('lit chaînes partagées, nombres, texte enrichi et chaînes en ligne, cases vides = null', () => {
    const rows = lireFeuille(buf, 1);
    expect(rows[0]).toEqual(['Code', 'Commune']);
    expect(rows[1]).toEqual([21005, 'Etterbeek', '17,6%⁽¹⁾']);
    expect(rows[2]).toEqual([21009, 'Ixelles', null, '⁽²⁾', 'texte']);
  });
  it('échoue clairement sur une feuille absente', () => {
    expect(() => lireFeuille(buf, 7)).toThrow(/feuille 7/);
  });
});
