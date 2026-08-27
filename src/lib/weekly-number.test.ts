// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { isUsablePin, resolveWeeklyNumber, type WeeklyNumber } from './weekly-number';

const i18n = (s: string) => ({ fr: s, nl: s, en: s, de: s });

const suggested: WeeklyNumber = {
  value: '16',
  label: i18n('Engagements chiffrés de la DPR'),
  source: i18n('Brussels Governance Monitor'),
};

const pin: WeeklyNumber = {
  value: '23,2 %',
  label: i18n('Ménages bruxellois en précarité hydrique'),
  source: i18n('Fondation Roi Baudouin'),
};

describe('isUsablePin', () => {
  it('rejects absent, empty and malformed pins', () => {
    expect(isUsablePin(null)).toBe(false);
    expect(isUsablePin(undefined)).toBe(false);
    expect(isUsablePin({})).toBe(false);
    expect(isUsablePin({ value: '' })).toBe(false);
    expect(isUsablePin({ value: '   ' })).toBe(false);
    expect(isUsablePin({ value: 42 })).toBe(false);
  });

  it('accepts a pin carrying a value', () => {
    expect(isUsablePin(pin)).toBe(true);
  });
});

describe('resolveWeeklyNumber', () => {
  it('keeps a human edit made on the review screen for the same week', () => {
    const edited: WeeklyNumber = { value: '735', label: i18n('x'), source: i18n('y') };
    const out = resolveWeeklyNumber({
      previous: { week: '2026-w35', sent: false, weeklyNumber: edited },
      week: '2026-w35',
      pin,
      suggested,
    });
    expect(out.origin).toBe('preserved');
    expect(out.weeklyNumber.value).toBe('735');
    // The pin must survive so it can still serve the week it was set for.
    expect(out.consumePin).toBe(false);
  });

  it('uses the pin when the week rolls over', () => {
    const out = resolveWeeklyNumber({
      previous: { week: '2026-w34', sent: true, weeklyNumber: suggested },
      week: '2026-w35',
      pin,
      suggested,
    });
    expect(out.origin).toBe('pinned');
    expect(out.weeklyNumber.value).toBe('23,2 %');
    expect(out.consumePin).toBe(true);
  });

  it('uses the pin when no pending digest exists yet', () => {
    const out = resolveWeeklyNumber({ previous: null, week: '2026-w35', pin, suggested });
    expect(out.origin).toBe('pinned');
    expect(out.consumePin).toBe(true);
  });

  it('ignores a preserved value once the digest has been sent', () => {
    const out = resolveWeeklyNumber({
      previous: { week: '2026-w35', sent: true, weeklyNumber: suggested },
      week: '2026-w35',
      pin,
      suggested,
    });
    expect(out.origin).toBe('pinned');
  });

  it('falls back to the automatic suggestion without a pin', () => {
    const out = resolveWeeklyNumber({
      previous: { week: '2026-w34', sent: true, weeklyNumber: pin },
      week: '2026-w35',
      pin: null,
      suggested,
    });
    expect(out.origin).toBe('suggested');
    expect(out.weeklyNumber.value).toBe('16');
    expect(out.consumePin).toBe(false);
  });

  it('does not let a consumed pin leak into the following week', () => {
    // Week 35 consumes the pin; the caller then clears the file, so week 36
    // sees no pin at all and must fall back to the suggestion.
    const w35 = resolveWeeklyNumber({ previous: null, week: '2026-w35', pin, suggested });
    expect(w35.consumePin).toBe(true);

    const w36 = resolveWeeklyNumber({
      previous: { week: '2026-w35', sent: true, weeklyNumber: w35.weeklyNumber },
      week: '2026-w36',
      pin: {},
      suggested,
    });
    expect(w36.origin).toBe('suggested');
    expect(w36.weeklyNumber.value).toBe('16');
  });
});
