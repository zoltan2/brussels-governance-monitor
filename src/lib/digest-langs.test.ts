// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { computeRecentDigestLangs } from './digest-langs';

// A week is "complete" when all 4 core locales (fr/nl/en/de) are present.
const CORE = ['fr', 'nl', 'en', 'de'];
const completeWeek = (week: string, extra: string[] = []) =>
  [...CORE, ...extra].map((lang) => ({ week, lang }));

describe('computeRecentDigestLangs', () => {
  it('unions langs over the 2 most recent complete weeks (a lang in only one still counts)', () => {
    const entries = [
      ...completeWeek('2026-w25', ['es', 'tr']),
      ...completeWeek('2026-w26', ['ar']), // ar only in w26, es/tr only in w25
    ];
    const { langs, latestCompleteWeek } = computeRecentDigestLangs(entries, 2);
    expect([...langs].sort()).toEqual(['ar', 'de', 'en', 'es', 'fr', 'nl', 'tr']);
    expect(latestCompleteWeek).toBe('2026-w26');
  });

  it('skips incomplete weeks (a week missing a core locale does not count)', () => {
    const entries = [
      ...completeWeek('2026-w24', ['pl']),
      // w25 incomplete: missing 'de'
      ...['fr', 'nl', 'en', 'ar'].map((lang) => ({ week: '2026-w25', lang })),
    ];
    const { langs, latestCompleteWeek } = computeRecentDigestLangs(entries, 2);
    // only w24 is complete → ar (w25-only) excluded, pl included
    expect([...langs].sort()).toEqual(['de', 'en', 'fr', 'nl', 'pl']);
    expect(latestCompleteWeek).toBe('2026-w24');
  });

  it('uses the single complete week when only one exists', () => {
    const entries = completeWeek('2026-w26', ['es']);
    const { langs, latestCompleteWeek } = computeRecentDigestLangs(entries, 2);
    expect([...langs].sort()).toEqual(['de', 'en', 'es', 'fr', 'nl']);
    expect(latestCompleteWeek).toBe('2026-w26');
  });

  it('returns empty + null when no complete week exists (cold-start / core outage)', () => {
    const entries = [
      ...['fr', 'nl', 'en'].map((lang) => ({ week: '2026-w26', lang })), // missing de
      { week: '2026-w26', lang: 'es' },
    ];
    const { langs, latestCompleteWeek } = computeRecentDigestLangs(entries, 2);
    expect(langs).toEqual([]);
    expect(latestCompleteWeek).toBeNull();
  });

  it('latestCompleteWeek is the most recent complete week, not the most recent week', () => {
    const entries = [
      ...completeWeek('2026-w25'),
      // w26 incomplete (missing en) → latest complete is w25
      ...['fr', 'nl', 'de'].map((lang) => ({ week: '2026-w26', lang })),
    ];
    const { latestCompleteWeek } = computeRecentDigestLangs(entries, 2);
    expect(latestCompleteWeek).toBe('2026-w25');
  });
});
