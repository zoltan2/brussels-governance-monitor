// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { fichierTs, paliers, statutComparaison } from './ecriture';

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

describe('statutComparaison (--verifier)', () => {
  const gen = (date: string, valeur: number) =>
    `// Généré par scripts/zru/extraire.ts le ${date}. Ne pas modifier à la main.\n\nexport const EXTRAIT_LE_X: string = "${date}";\nexport const V = ${valeur};\n`;
  it('inchangée quand seules la date de génération et la date d’extraction diffèrent', () => {
    expect(statutComparaison(gen('2026-09-24', 1), gen('2026-10-01', 1))).toBe('inchangée');
  });
  it('MISE À JOUR quand une valeur change', () => {
    expect(statutComparaison(gen('2026-09-24', 1), gen('2026-09-24', 2))).toBe('MISE À JOUR');
  });
  it('MISE À JOUR quand le fichier n’existe pas encore', () => {
    expect(statutComparaison(null, gen('2026-09-24', 1))).toBe('MISE À JOUR');
  });
});
