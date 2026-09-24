// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { fichierTs, paliers } from './ecriture';

describe('paliers', () => {
  it('répartit les valeurs non nulles en 5 quantiles et laisse null à part', () => {
    const { seuils, palierDe } = paliers([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, null]);
    expect(seuils).toHaveLength(4);
    expect(palierDe(1)).toBe(1);
    expect(palierDe(10)).toBe(5);
    expect(palierDe(null)).toBeNull();
  });
});

describe('fichierTs', () => {
  it('écrit un en-tête, des exports JSON et des annotations de type', () => {
    const s = fichierTs('// Généré', { A: [1, null] }, { A: '(number | null)[]' });
    expect(s).toContain('// Généré');
    expect(s).toContain('export const A: (number | null)[] = [1,null];');
  });
});
