// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { describeFreshness, freshnessClassName } from './snapshot-freshness';

const now = Date.parse('2026-09-19T22:00:00Z');
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

describe('describeFreshness', () => {
  it('rend null sans date ou sur une date illisible', () => {
    expect(describeFreshness(null, { staleAfterHours: 26, now })).toBeNull();
    expect(describeFreshness('pas une date', { staleAfterHours: 26, now })).toBeNull();
  });

  it('annonce un relevé récent sans alarmer', () => {
    expect(describeFreshness(hoursAgo(0.5), { staleAfterHours: 26, now })).toEqual({
      label: "relevé il y a moins d'une heure",
      level: 'fresh',
    });
    expect(describeFreshness(hoursAgo(5), { staleAfterHours: 26, now })).toEqual({
      label: 'relevé il y a 5 h',
      level: 'fresh',
    });
  });

  // Le cas trouvé par la red team : 35 jours s'affichaient comme une simple
  // information, du même gris que le reste.
  it('signale un instantané figé', () => {
    const old = describeFreshness(hoursAgo(35 * 24), { staleAfterHours: 26, now });
    expect(old).toEqual({ label: 'en retard : dernier relevé il y a 35 j', level: 'stale' });
    expect(freshnessClassName(old!.level)).toContain('text-warning-fg');
  });

  it('bascule exactement au seuil', () => {
    expect(describeFreshness(hoursAgo(25), { staleAfterHours: 26, now })?.level).toBe('fresh');
    expect(describeFreshness(hoursAgo(26), { staleAfterHours: 26, now })?.level).toBe('stale');
  });

  // L'autre cas de la red team : une date en 2027 donnait « il y a moins
  // d'une heure ».
  it('dénonce une date dans le futur au lieu de la lisser', () => {
    const future = describeFreshness(hoursAgo(-24), { staleAfterHours: 26, now });
    expect(future).toEqual({
      label: 'horloge incohérente : instantané daté du futur',
      level: 'clock',
    });
    expect(freshnessClassName(future!.level)).toContain('text-warning-fg');
  });

  it('tolère une minute de décalage entre horloges', () => {
    expect(describeFreshness(hoursAgo(-0.005), { staleAfterHours: 26, now })?.level).toBe(
      'fresh',
    );
  });
});
