// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { RADAR_SUMMARY_MAX, addedRadarEntries, radarSummaryProblems } from './radar-summary-check';
import { HOMEPAGE_SIGNAL_MAX_CHARS } from './homepage-signals';

const ok = (n: number) => 'x'.repeat(n);
const full = (n: number) => ({ fr: ok(n), nl: ok(n), en: ok(n), de: ok(n) });

describe('radarSummaryProblems', () => {
  it('suit le plafond réel de la page d\'accueil (HOMEPAGE_SIGNAL_MAX_CHARS)', () => {
    // Si la page change son plafond sans que la garde suive, la garde
    // laisserait passer des résumés coupés « … », ou bloquerait pour rien.
    // Importée depuis son module (src/lib/homepage-signals.ts depuis #625) plutôt
    // que cherchée par regex dans page.tsx : la regex a cassé la CI de main
    // quand la constante a déménagé.
    expect(HOMEPAGE_SIGNAL_MAX_CHARS).toBe(RADAR_SUMMARY_MAX);
  });

  it('refuse un signal sans summary : repli « Am 14. » (good-move-calendrier-succession, revue yellow)', () => {
    const p = radarSummaryProblems({ id: '2026-05-08-good-move-calendrier-succession' });
    expect(p).toHaveLength(1);
    expect(p[0]).toContain('summary absent');
  });

  it('refuse une langue manquante ou vide', () => {
    const p = radarSummaryProblems({ id: 's', summary: { fr: ok(100), nl: ok(100), en: ok(100), de: '  ' } });
    expect(p).toEqual(['summary.de absent ou vide.']);
  });

  it('refuse un résumé trop court ou au-delà du plafond (cas réel : dette-bruxelloise nl, 182)', () => {
    expect(radarSummaryProblems({ id: 's', summary: { ...full(100), fr: ok(19) } })[0]).toContain('trop court');
    expect(radarSummaryProblems({ id: 's', summary: { ...full(100), nl: ok(182) } })[0]).toContain('trop long');
  });

  it('accepte les bornes exactes', () => {
    expect(radarSummaryProblems({ id: 's', summary: full(20) })).toEqual([]);
    expect(radarSummaryProblems({ id: 's', summary: full(RADAR_SUMMARY_MAX) })).toEqual([]);
  });
});

describe('addedRadarEntries', () => {
  it("ne retient que les id absents de la base", () => {
    expect(addedRadarEntries([{ id: 'a' }], [{ id: 'a' }, { id: 'b' }]).map((e) => e.id)).toEqual(['b']);
    expect(addedRadarEntries(null, [{ id: 'a' }]).map((e) => e.id)).toEqual(['a']);
  });
});
