// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { deriveRobustness, robustnessColorClass } from './derive-robustness';

const baseMetric = {
  bgmAlert: false,
  proofSources: [],
};

describe('deriveRobustness — explicit override precedence', () => {
  it('uses explicit robustness when provided (override always wins)', () => {
    expect(deriveRobustness({ ...baseMetric, robustness: 65, proofStatus: 'contested' })).toBe(65);
    expect(deriveRobustness({ ...baseMetric, robustness: 0 })).toBe(0);
    expect(deriveRobustness({ ...baseMetric, robustness: 100 })).toBe(100);
  });

  it('clamps explicit override defensively', () => {
    expect(deriveRobustness({ ...baseMetric, robustness: -10 })).toBe(0);
    expect(deriveRobustness({ ...baseMetric, robustness: 150 })).toBe(100);
  });

  it('does NOT recompute when explicit value present, even with rich proofSources', () => {
    expect(
      deriveRobustness({
        robustness: 65,
        proofStatus: 'contested',
        bgmAlert: true,
        proofSources: [
          { label: 'a', url: 'https://a', type: 'primary' },
          { label: 'b', url: 'https://b', type: 'contested' },
        ],
      }),
    ).toBe(65);
  });
});

describe('deriveRobustness — fallback formula', () => {
  it('returns neutral 60 when no proofStatus and no sources', () => {
    expect(deriveRobustness(baseMetric)).toBe(60);
  });

  it('uses STATUS_BASE for each proofStatus', () => {
    expect(deriveRobustness({ ...baseMetric, proofStatus: 'stable' })).toBe(85);
    expect(deriveRobustness({ ...baseMetric, proofStatus: 'confirmed_declared' })).toBe(80);
    expect(deriveRobustness({ ...baseMetric, proofStatus: 'projection_pending' })).toBe(60);
    expect(deriveRobustness({ ...baseMetric, proofStatus: 'contested' })).toBe(45);
  });

  it('adds +5 per primary source, capped at +10', () => {
    expect(
      deriveRobustness({
        ...baseMetric,
        proofStatus: 'stable',
        proofSources: [{ label: 'a', url: 'https://a', type: 'primary' }],
      }),
    ).toBe(90); // 85 + 5

    expect(
      deriveRobustness({
        ...baseMetric,
        proofStatus: 'stable',
        proofSources: [
          { label: 'a', url: 'https://a', type: 'primary' },
          { label: 'b', url: 'https://b', type: 'primary' },
        ],
      }),
    ).toBe(95); // 85 + 10

    expect(
      deriveRobustness({
        ...baseMetric,
        proofStatus: 'stable',
        proofSources: [
          { label: 'a', url: 'https://a', type: 'primary' },
          { label: 'b', url: 'https://b', type: 'primary' },
          { label: 'c', url: 'https://c', type: 'primary' },
        ],
      }),
    ).toBe(95); // 85 + 10 (capped)
  });

  it('subtracts 10 if at least one contested source', () => {
    expect(
      deriveRobustness({
        ...baseMetric,
        proofStatus: 'stable',
        proofSources: [{ label: 'a', url: 'https://a', type: 'contested' }],
      }),
    ).toBe(75); // 85 - 10

    // multiple contested still only -10 (not cumulative)
    expect(
      deriveRobustness({
        ...baseMetric,
        proofStatus: 'stable',
        proofSources: [
          { label: 'a', url: 'https://a', type: 'contested' },
          { label: 'b', url: 'https://b', type: 'contested' },
        ],
      }),
    ).toBe(75);
  });

  it('subtracts 5 when bgmAlert is true', () => {
    expect(deriveRobustness({ ...baseMetric, proofStatus: 'stable', bgmAlert: true })).toBe(80); // 85 - 5
  });

  it('cpas-234-vs-300 fallback yields 40 (matches spec §11.4 formula)', () => {
    // Same metric as the phase 1a pilot, simulating no explicit override:
    // contested base 45 + 5 (1 primary) - 10 (1 contested) - 0 (no alert) = 40
    expect(
      deriveRobustness({
        proofStatus: 'contested',
        bgmAlert: false,
        proofSources: [
          { label: 'UVCW', url: 'https://www.uvcw.be', type: 'primary' },
          { label: 'SPP IS', url: 'https://www.mi-is.be', type: 'contested' },
        ],
      }),
    ).toBe(40);
  });

  it('clamps fallback to [0, 100]', () => {
    // contrived: many penalties pushing below 0
    expect(
      deriveRobustness({
        proofStatus: 'contested',
        bgmAlert: true,
        proofSources: [
          { label: 'a', url: 'https://a', type: 'contested' },
          { label: 'b', url: 'https://b', type: 'contested' },
        ],
      }),
    ).toBe(30); // 45 - 10 - 5 = 30, still in range

    // Stays in range even with no sources
    expect(deriveRobustness({ proofStatus: 'contested', bgmAlert: true, proofSources: [] })).toBe(40); // 45 - 5
  });
});

describe('robustnessColorClass', () => {
  it('returns teal for >=80 (stable)', () => {
    expect(robustnessColorClass(100)).toBe('text-teal-600');
    expect(robustnessColorClass(85)).toBe('text-teal-600');
    expect(robustnessColorClass(80)).toBe('text-teal-600');
  });

  it('returns amber for 65-79 (à confirmer)', () => {
    expect(robustnessColorClass(79)).toBe('text-amber-600');
    expect(robustnessColorClass(70)).toBe('text-amber-600');
    expect(robustnessColorClass(65)).toBe('text-amber-600');
  });

  it('returns rose for <65 (contesté)', () => {
    expect(robustnessColorClass(64)).toBe('text-rose-600');
    expect(robustnessColorClass(40)).toBe('text-rose-600');
    expect(robustnessColorClass(0)).toBe('text-rose-600');
  });
});
