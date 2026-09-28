// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { changeTypeFinding, type ChangelogRef } from './change-type-consistency';

// Entrées réelles de data/changelog.json autour de l'incident du 28/09/2026.
const LOG: ChangelogRef[] = [
  { date: '2026-09-28', type: 'updated', section: 'dossiers', targetSlug: 'enseignement' },
  { date: '2026-09-22', type: 'corrected', section: 'dossiers', targetSlug: 'enseignement' },
  { date: '2026-09-24', type: 'corrected', section: 'domains', targetSlug: 'housing' },
  { date: '2026-09-18', type: 'updated', section: 'domains', targetSlug: 'housing' },
  { date: '2026-09-28', type: 'updated', section: 'domains', targetSlug: 'education' },
  { date: '2026-09-20', type: 'added', section: 'domains', targetSlug: 'nouveau' },
  { date: '2026-09-21', type: 'corrected', section: 'sectors', targetSlug: 'commerce' },
  { date: '2026-09-21', type: 'updated', section: 'sectors', targetSlug: 'commerce' },
];

describe('changeTypeFinding', () => {
  it("refuse l'état en ligne le 28/09 : enseignement « corrected » sur une entrée « updated » (a609698a)", () => {
    const f = changeTypeFinding(
      { dir: 'content/dossiers', slug: 'enseignement', changeType: 'corrected', changeSummaryDate: '2026-09-28' },
      LOG,
    );
    expect(f?.level).toBe('error');
    expect(f?.message).toContain('changeType: updated');
  });

  it('accepte la fiche corrigée par #623', () => {
    expect(
      changeTypeFinding({ dir: 'content/dossiers', slug: 'enseignement', changeType: 'updated', changeSummaryDate: '2026-09-28' }, LOG),
    ).toBeNull();
  });

  it("refuse une correction tue : entrée « corrected », fiche « updated »", () => {
    const f = changeTypeFinding(
      { dir: 'content/dossiers', slug: 'enseignement', changeType: 'updated', changeSummaryDate: '2026-09-22' },
      [{ date: '2026-09-22', type: 'corrected', section: 'dossiers', targetSlug: 'enseignement' }],
    );
    expect(f?.level).toBe('error');
  });

  it("ignore une fiche dont le résumé n'est pas du jour de la dernière entrée", () => {
    expect(
      changeTypeFinding({ dir: 'content/dossiers', slug: 'enseignement', changeType: 'corrected', changeSummaryDate: '2026-09-22' }, LOG),
    ).toBeNull();
  });

  it('ignore une fiche sans entrée ou sans changeSummaryDate', () => {
    expect(changeTypeFinding({ dir: 'content/dossiers', slug: 'absent', changeType: 'corrected', changeSummaryDate: '2026-09-28' }, LOG)).toBeNull();
    expect(changeTypeFinding({ dir: 'content/dossiers', slug: 'enseignement', changeType: 'corrected' }, LOG)).toBeNull();
  });

  it('ne confond pas les sections : le domaine education ne lit pas le dossier enseignement', () => {
    expect(
      changeTypeFinding({ dir: 'content/domain-cards', slug: 'education', changeType: 'updated', changeSummaryDate: '2026-09-28' }, LOG),
    ).toBeNull();
    expect(
      changeTypeFinding({ dir: 'content/sector-cards', slug: 'enseignement', changeType: 'corrected', changeSummaryDate: '2026-09-28' }, LOG),
    ).toBeNull();
  });

  it('traduit le vocabulaire des fiches domaine (new, status-change, data-refresh)', () => {
    expect(changeTypeFinding({ dir: 'content/domain-cards', slug: 'nouveau', changeType: 'new', changeSummaryDate: '2026-09-20' }, LOG)).toBeNull();
    expect(changeTypeFinding({ dir: 'content/domain-cards', slug: 'education', changeType: 'data-refresh', changeSummaryDate: '2026-09-28' }, LOG)).toBeNull();
    expect(changeTypeFinding({ dir: 'content/domain-cards', slug: 'education', changeType: 'new', changeSummaryDate: '2026-09-28' }, LOG)?.level).toBe('error');
  });

  it("n'échoue pas sur une correction qu'une fiche domaine ne peut pas dire (housing, 24/09) : avertissement", () => {
    const f = changeTypeFinding({ dir: 'content/domain-cards', slug: 'housing', changeType: 'updated', changeSummaryDate: '2026-09-24' }, LOG);
    expect(f?.level).toBe('warning');
  });

  it("accepte l'un ou l'autre type quand deux entrées tombent le même jour", () => {
    for (const changeType of ['corrected', 'updated']) {
      expect(changeTypeFinding({ dir: 'content/sector-cards', slug: 'commerce', changeType, changeSummaryDate: '2026-09-21' }, LOG)).toBeNull();
    }
    expect(changeTypeFinding({ dir: 'content/sector-cards', slug: 'commerce', changeType: 'added', changeSummaryDate: '2026-09-21' }, LOG)?.level).toBe('error');
  });

  it('lit un changeType absent comme « updated », ce que la bannière affiche', () => {
    expect(changeTypeFinding({ dir: 'content/dossiers', slug: 'enseignement', changeSummaryDate: '2026-09-28' }, LOG)).toBeNull();
    expect(
      changeTypeFinding({ dir: 'content/dossiers', slug: 'enseignement', changeSummaryDate: '2026-09-22' }, [
        { date: '2026-09-22', type: 'corrected', section: 'dossiers', targetSlug: 'enseignement' },
      ])?.level,
    ).toBe('error');
  });
});
