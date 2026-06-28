// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { daysSince, WHATCHANGED_MAX_AGE_DAYS } from './freshness';

describe('daysSince', () => {
  const now = new Date('2026-06-27T10:00:00Z');

  it('returns 0 for the same calendar day', () => {
    expect(daysSince('2026-06-27', now)).toBe(0);
  });

  it('counts whole calendar days for a date-only input', () => {
    expect(daysSince('2026-06-20', now)).toBe(7);
  });

  it('has no off-by-one when now is late in the UTC day', () => {
    expect(daysSince('2026-05-28', new Date('2026-06-27T23:59:59Z'))).toBe(30);
  });

  it('normalizes datetime inputs to UTC midnight', () => {
    expect(daysSince('2026-06-20T18:30:00Z', now)).toBe(7);
  });

  it('reports a 40-day-old change as beyond the window', () => {
    expect(daysSince('2026-05-18', now)).toBeGreaterThan(WHATCHANGED_MAX_AGE_DAYS);
  });
});
