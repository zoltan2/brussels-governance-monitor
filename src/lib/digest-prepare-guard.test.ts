// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { digestDejaEnvoye, isoWeekString } from './digest-prepare-guard';
import { weekRange } from './digest-check';

describe('digestDejaEnvoye', () => {
  it('protège un digest de la même semaine déjà envoyé ou programmé', () => {
    expect(digestDejaEnvoye({ week: '2026-w42', sent: true }, '2026-w42')).toBe(true);
  });

  it('laisse préparer une semaine nouvelle, même si la précédente est partie', () => {
    expect(digestDejaEnvoye({ week: '2026-w41', sent: true }, '2026-w42')).toBe(false);
  });

  it('laisse repréparer la même semaine tant qu’elle n’est pas envoyée', () => {
    expect(digestDejaEnvoye({ week: '2026-w42', sent: false }, '2026-w42')).toBe(false);
    expect(digestDejaEnvoye({ week: '2026-w42' }, '2026-w42')).toBe(false);
  });

  it('laisse préparer quand aucun fichier n’existe', () => {
    expect(digestDejaEnvoye(null, '2026-w42')).toBe(false);
  });
});

describe('isoWeekString', () => {
  it('donne la semaine ISO du vendredi, pas la précédente (cas du 16/10/2026)', () => {
    expect(isoWeekString(new Date('2026-10-16T11:35:00Z'))).toBe('2026-w42');
    expect(isoWeekString(new Date('2026-10-12T06:00:00Z'))).toBe('2026-w42');
  });

  it('garde la semaine du passage habituel du dimanche 21 h', () => {
    expect(isoWeekString(new Date('2026-10-11T19:00:00Z'))).toBe('2026-w41');
    expect(isoWeekString(new Date('2026-10-18T19:00:00Z'))).toBe('2026-w42');
  });

  it('suit les semaines qui chevauchent deux années', () => {
    expect(isoWeekString(new Date('2025-12-29T12:00:00Z'))).toBe('2026-w01');
    expect(isoWeekString(new Date('2027-01-01T12:00:00Z'))).toBe('2026-w53');
    expect(isoWeekString(new Date('2021-01-03T12:00:00Z'))).toBe('2020-w53');
  });

  it('retombe sur le lundi donné par weekRange pour chaque jour de 2026', () => {
    for (let d = new Date('2026-01-01T12:00:00Z'); d.getUTCFullYear() === 2026; d.setUTCDate(d.getUTCDate() + 1)) {
      const { monday, sunday } = weekRange(isoWeekString(d));
      const jour = d.toISOString().slice(0, 10);
      expect(jour >= monday && jour <= sunday).toBe(true);
    }
  });
});
