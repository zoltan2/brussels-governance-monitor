// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { changeSummaryDateProblem } from './change-summary-date';

describe('changeSummaryDateProblem', () => {
  it('refuse un résumé nouveau sans date (le cas lez du 10/09)', () => {
    const r = changeSummaryDateProblem(
      { changeSummary: 'Ancien.', lastModified: '2026-09-06' },
      { changeSummary: 'Le pass annuel retourne en préparation.', lastModified: '2026-09-10' },
    );
    expect(r).toContain('changeSummaryDate');
  });

  it('accepte un résumé nouveau daté', () => {
    expect(
      changeSummaryDateProblem(null, { changeSummary: 'Nouveau.', changeSummaryDate: '2026-09-10', lastModified: '2026-09-10' }),
    ).toBeNull();
  });

  it("ignore un ancien résumé resté tel quel, même sans date", () => {
    const same = { changeSummary: 'Inchangé.', lastModified: '2026-08-01' };
    expect(changeSummaryDateProblem(same, { ...same, lastModified: '2026-09-10' })).toBeNull();
  });

  it('refuse une date postérieure à lastModified', () => {
    expect(
      changeSummaryDateProblem(null, { changeSummary: 'x', changeSummaryDate: '2026-09-12', lastModified: '2026-09-10' }),
    ).toContain('postérieure');
  });

  it("ne dit rien d'une fiche sans résumé", () => {
    expect(changeSummaryDateProblem(null, { lastModified: '2026-09-10' })).toBeNull();
  });
});
