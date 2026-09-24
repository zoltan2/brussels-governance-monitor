// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// src/components/dossiers/zru/data/geometrie.test.ts
import { describe, expect, it } from 'vitest';
import * as G from './geometrie';
import { validerProvenance } from './types';

const octets = (s: string) => Buffer.byteLength(s, 'utf8');

describe('géométrie ZRU', () => {
  it('145 quartiers, identifiants uniques, chemins non vides', () => {
    expect(G.QUARTIERS).toHaveLength(145);
    expect(new Set(G.QUARTIERS.map((q) => q.mdId)).size).toBe(145);
    for (const q of G.QUARTIERS) expect(q.d).toMatch(/^M\d/);
  });
  it('surfaces recalculées proches des surfaces officielles (tolérance par couche)', () => {
    expect(Math.abs(G.SURFACES_KM2.zru2026 - 27.7) / 27.7).toBeLessThan(0.01);
    expect(Math.abs(G.SURFACES_KM2.zru2020 - 30.91) / 30.91).toBeLessThan(0.012);
  });
  it('budget de poids : quartiers ≤ 50 Ko, périmètres ≤ 16 Ko', () => {
    expect(octets(G.QUARTIERS.map((q) => q.d).join(''))).toBeLessThan(50_000);
    const zru = G.ZRU_2020 + G.ZRU_2026 + [...G.SECTEURS_ENTRANTS, ...G.SECTEURS_SORTANTS].map((s) => s.d).join('');
    expect(octets(zru)).toBeLessThan(16_000);
  });
  it('secteurs entrants et sortants disjoints, clés composées uniques', () => {
    const ids = [...G.SECTEURS_ENTRANTS, ...G.SECTEURS_SORTANTS].map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('provenance complète', () => expect(validerProvenance(G.PROVENANCE_GEOMETRIE)).toEqual([]));
});
