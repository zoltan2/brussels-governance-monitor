// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, beforeEach } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.AUTH_SECRET = 'secret-auth';
const { getDb } = await import('@/lib/db');
const { noterChoix, noterChoixCoulisses, CONSERVATION_MS } = await import('./refus');
const { fingerprintEmail } = await import('@/lib/desabonnements');
const db = getDb()!;

const lignes = () =>
  db.prepare('SELECT empreinte, sens, source, le FROM coulisses_refus ORDER BY id').all() as Array<{
    empreinte: string;
    sens: string;
    source: string;
    le: number;
  }>;

beforeEach(() => {
  db.exec('DELETE FROM coulisses_refus');
});

describe('refus des coulisses datés', () => {
  it('note un refus avec sa date et sa source, sous empreinte, jamais l’adresse', () => {
    noterChoixCoulisses('A@Example.org', false, 'one-click');
    const [l] = lignes();
    expect(l.sens).toBe('refus');
    expect(l.source).toBe('one-click');
    expect(l.empreinte).toBe(fingerprintEmail('a@example.org'));
    expect(JSON.stringify(lignes())).not.toContain('example.org');
  });

  it('un refus rejoué (client mail, double enregistrement) n’est noté qu’une fois', () => {
    expect(noterChoix(db, 'e1', 'refus', 'one-click', 1000)).toBe(true);
    expect(noterChoix(db, 'e1', 'refus', 'one-click', 2000)).toBe(false);
    expect(noterChoix(db, 'e1', 'refus', 'preferences', 3000)).toBe(false);
    expect(lignes()).toHaveLength(1);
  });

  it('une case cochée sans refus préalable n’est pas une reprise', () => {
    expect(noterChoix(db, 'e1', 'reprise', 'preferences', 1000)).toBe(false);
    expect(lignes()).toHaveLength(0);
  });

  it('refus, reprise, puis nouveau refus : trois lignes', () => {
    noterChoix(db, 'e1', 'refus', 'one-click', 1000);
    noterChoix(db, 'e1', 'reprise', 'preferences', 2000);
    noterChoix(db, 'e1', 'reprise', 'preferences', 2500);
    noterChoix(db, 'e1', 'refus', 'preferences', 3000);
    expect(lignes().map((l) => `${l.sens}@${l.le}`)).toEqual(['refus@1000', 'reprise@2000', 'refus@3000']);
  });

  it('les personnes sont distinctes', () => {
    noterChoix(db, 'e1', 'refus', 'one-click', 1000);
    expect(noterChoix(db, 'e2', 'refus', 'one-click', 1000)).toBe(true);
  });

  it('efface ce qui a plus de 24 mois', () => {
    noterChoix(db, 'vieux', 'refus', 'one-click', 1000);
    noterChoix(db, 'neuf', 'refus', 'one-click', 1000 + CONSERVATION_MS + 1);
    expect(lignes().map((l) => l.empreinte)).toEqual(['neuf']);
  });
});
