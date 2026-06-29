// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { getCommitments, getCommitmentById, commitmentSchema } from './commitments';
import { z } from 'zod';

describe('getCommitments', () => {
  it('returns all 16 DPR commitments', () => {
    expect(getCommitments()).toHaveLength(16);
  });

  it('commitment ids are unique', () => {
    const ids = getCommitments().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every commitment has all required i18n fields (fr, nl, en, de)', () => {
    const locales = ['fr', 'nl', 'en', 'de'] as const;
    for (const c of getCommitments()) {
      for (const locale of locales) {
        expect(c.target[locale]).toBeTruthy();
        expect(c.indicator[locale]).toBeTruthy();
        expect(c.description[locale]).toBeTruthy();
        expect(c.baseline[locale]).toBeTruthy();
      }
    }
  });

  it('every statusHistory entry has a YYYY-MM-DD date and non-empty source', () => {
    for (const c of getCommitments()) {
      expect(c.statusHistory.length).toBeGreaterThan(0);
      for (const h of c.statusHistory) {
        expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(h.source.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('every dataPoint (when present) has a numeric value', () => {
    for (const c of getCommitments()) {
      for (const dp of c.dataPoints ?? []) {
        expect(typeof dp.value).toBe('number');
        expect(dp.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});

describe('getCommitmentById', () => {
  it('returns the correct commitment for a known id', () => {
    const c = getCommitmentById('budget-balance');
    expect(c).toBeDefined();
    expect(c?.id).toBe('budget-balance');
    expect(c?.domain).toBe('budget');
  });

  it('returns undefined for an unknown id', () => {
    expect(getCommitmentById('does-not-exist')).toBeUndefined();
  });
});

describe('commitmentSchema validation', () => {
  const validBase = {
    id: 'test-commitment',
    domain: 'budget',
    target: { fr: 'Cible', nl: 'Doel', en: 'Target', de: 'Ziel' },
    indicator: { fr: 'Indicateur', nl: 'Indicator', en: 'Indicator', de: 'Indikator' },
    description: { fr: 'Description', nl: 'Beschrijving', en: 'Description', de: 'Beschreibung' },
    baseline: { fr: 'Base', nl: 'Basis', en: 'Baseline', de: 'Basis' },
    deadline: '2029',
    chapter: 2,
    minister: {
      name: 'Ministre Test',
      portfolio: { fr: 'Portefeuille', nl: 'Portefeuille', en: 'Portfolio', de: 'Portfolio' },
    },
    statusHistory: [{ date: '2026-02-13', status: 'not-started', source: 'DPR adoptée' }],
  };

  it('accepts a valid commitment object', () => {
    expect(() => commitmentSchema.parse(validBase)).not.toThrow();
  });

  it('rejects an unknown domain', () => {
    expect(() =>
      commitmentSchema.parse({ ...validBase, domain: 'invalid-domain' })
    ).toThrow(z.ZodError);
  });

  it('rejects an unknown statusHistory status', () => {
    expect(() =>
      commitmentSchema.parse({
        ...validBase,
        statusHistory: [{ date: '2026-02-13', status: 'unknown-status', source: 'src' }],
      })
    ).toThrow(z.ZodError);
  });

  it('rejects a statusHistory entry with a malformed date', () => {
    expect(() =>
      commitmentSchema.parse({
        ...validBase,
        statusHistory: [{ date: '13-02-2026', status: 'not-started', source: 'src' }],
      })
    ).toThrow(z.ZodError);
  });

  it('rejects a commitment with an empty id', () => {
    expect(() => commitmentSchema.parse({ ...validBase, id: '' })).toThrow(z.ZodError);
  });

  it('accepts a commitment without dataPoints', () => {
    const withoutDataPoints: Record<string, unknown> = { ...validBase };
    delete withoutDataPoints.dataPoints;
    expect(() => commitmentSchema.parse(withoutDataPoints)).not.toThrow();
  });
});
