// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { parseBudget, budgetSummary, budgetLabels, type BudgetLabels } from './budget';

const LABELS: BudgetLabels = {
  unpublished: 'Non publié',
  notQuantified: 'Non chiffré',
  notApplicable: 'Sans objet',
  notCommunicated: 'Non communiqué',
  notConsolidated: 'Non consolidé',
  more: (count) => `+${count}`,
};

describe('parseBudget', () => {
  it('reads a plain string as a single text value', () => {
    expect(parseBudget('~5,2 milliards EUR (projet suspendu)')).toEqual({
      kind: 'text',
      text: '~5,2 milliards EUR (projet suspendu)',
    });
  });

  it('reads an array as budget lines and defaults confidence to official', () => {
    const parsed = parseBudget([
      { label: 'Pénalités cumulées', value: '~25 M EUR', confidence: 'estimated' },
      { label: 'Astreintes', value: '18 000 EUR/infraction', note: 'plafond 18 M EUR/route' },
    ]);

    expect(parsed).toEqual({
      kind: 'lines',
      lines: [
        {
          label: 'Pénalités cumulées',
          value: '~25 M EUR',
          note: undefined,
          confidence: 'estimated',
        },
        {
          label: 'Astreintes',
          value: '18 000 EUR/infraction',
          note: 'plafond 18 M EUR/route',
          confidence: 'official',
        },
      ],
    });
  });

  it('reads a status object with its reason', () => {
    expect(parseBudget({ status: 'unpublished', reason: 'Le service ne communique rien.' })).toEqual({
      kind: 'status',
      status: 'unpublished',
      reason: 'Le service ne communique rien.',
    });
  });

  it('returns null when the field is absent', () => {
    expect(parseBudget(undefined)).toBeNull();
  });

  it('returns null for an empty or blank string', () => {
    expect(parseBudget('')).toBeNull();
    expect(parseBudget('   ')).toBeNull();
  });

  it('returns null for an empty array', () => {
    expect(parseBudget([])).toBeNull();
  });
});

describe('budgetSummary', () => {
  it('returns a plain string unchanged', () => {
    expect(budgetSummary('~5,2 milliards EUR', LABELS)).toBe('~5,2 milliards EUR');
  });

  it('joins label and value for a single line, without a counter', () => {
    expect(budgetSummary([{ label: 'Dotation régionale', value: '~600 000 EUR/an' }], LABELS)).toBe(
      'Dotation régionale ~600 000 EUR/an',
    );
  });

  it('shows the first line and counts the remaining ones', () => {
    const lines = [
      { label: 'Pénalités cumulées', value: '~25 M EUR' },
      { label: 'Amendes régionales', value: '~32 M EUR' },
      { label: 'Astreintes', value: '18 000 EUR/infraction' },
      { label: 'Coût sanitaire', value: '>1 Mrd EUR/an' },
    ];

    expect(budgetSummary(lines, LABELS)).toBe('Pénalités cumulées ~25 M EUR +3');
  });

  it('shows the status label alone, never its reason', () => {
    expect(
      budgetSummary({ status: 'unpublished', reason: 'Ni les redevances ni les coûts communaux.' }, LABELS),
    ).toBe('Non publié');
    expect(budgetSummary({ status: 'not-quantified' }, LABELS)).toBe('Non chiffré');
    expect(budgetSummary({ status: 'not-applicable' }, LABELS)).toBe('Sans objet');
  });

  // The editorial wording of a missing budget is itself information: "non
  // consolidé" (the parts exist, nobody sums them) does not mean the same thing
  // as "non chiffré" (nobody has costed it). Each keeps its own status rather
  // than being folded into a neighbour.
  it('keeps not-communicated and not-consolidated distinct from their neighbours', () => {
    expect(budgetSummary({ status: 'not-communicated' }, LABELS)).toBe('Non communiqué');
    expect(budgetSummary({ status: 'not-consolidated' }, LABELS)).toBe('Non consolidé');
  });

  it('returns null when there is nothing to summarise', () => {
    expect(budgetSummary(undefined, LABELS)).toBeNull();
    expect(budgetSummary([], LABELS)).toBeNull();
  });
});

describe('budgetLabels', () => {
  it('maps the six budget keys onto a translator, interpolating the counter', () => {
    const t = (key: string, values?: Record<string, string | number>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;

    const labels = budgetLabels(t);

    expect(labels.unpublished).toBe('budgetUnpublished');
    expect(labels.notQuantified).toBe('budgetNotQuantified');
    expect(labels.notApplicable).toBe('budgetNotApplicable');
    expect(labels.notCommunicated).toBe('budgetNotCommunicated');
    expect(labels.notConsolidated).toBe('budgetNotConsolidated');
    expect(labels.estimated).toBe('budgetEstimated');
    expect(labels.unconfirmed).toBe('budgetUnconfirmed');
    expect(labels.more(3)).toBe('budgetMore:{"count":3}');
  });
});
