// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BudgetTable, type BudgetTableLabels } from './budget-table';

const LABELS: BudgetTableLabels = {
  unpublished: 'Non publié',
  notQuantified: 'Non chiffré',
  notApplicable: 'Sans objet',
  notCommunicated: 'Non communiqué',
  notConsolidated: 'Non consolidé',
  more: (count) => `+${count}`,
  estimated: '(est.)',
  unconfirmed: '(à confirmer)',
};

afterEach(() => cleanup());

describe('BudgetTable', () => {
  it('renders nothing when the fiche has no budget', () => {
    const { container } = render(
      <BudgetTable heading="Budget estimé" value={undefined} labels={LABELS} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders a short single amount as plain text, never at KPI weight', () => {
    render(
      <BudgetTable heading="Budget estimé" value="~5,2 milliards EUR (projet suspendu)" labels={LABELS} />,
    );

    const amount = screen.getByText('~5,2 milliards EUR (projet suspendu)');
    expect(amount).toBeTruthy();
    // The defect being fixed: a prose-shaped field typeset as a big bold KPI.
    expect(amount.className).not.toMatch(/text-xl/);
  });

  // A single short amount is a KPI and reads as one. A sentence is prose and
  // must read as prose — typesetting it as an amount is the defect being fixed.
  it('renders a long prose value as prose, not as an amount', () => {
    const prose =
      "Subventions emploi d'insertion en économie sociale, montant non publié séparément";
    render(<BudgetTable heading="Budget estimé" value={prose} labels={LABELS} />);

    const el = screen.getByText(prose);
    expect(el.className).not.toMatch(/font-semibold|font-bold|text-brand-900/);
    expect(el.className).toMatch(/text-sm/);
  });

  it('still typesets a short single amount as an amount', () => {
    render(<BudgetTable heading="Budget estimé" value="~5,2 milliards EUR" labels={LABELS} />);

    const el = screen.getByText('~5,2 milliards EUR');
    expect(el.className).toMatch(/font-semibold/);
  });

  it('renders each budget line with its label, amount and note', () => {
    render(
      <BudgetTable
        heading="Budget estimé"
        value={[
          { label: 'Pénalités cumulées', value: '~25 M EUR', confidence: 'estimated' },
          {
            label: 'Astreintes',
            value: '18 000 EUR/infraction',
            note: 'plafond 18 M EUR/route · 20 000 EUR/jour (piste 01)',
          },
        ]}
        labels={LABELS}
      />,
    );

    expect(screen.getByText('Budget estimé')).toBeTruthy();
    expect(screen.getByText('Pénalités cumulées')).toBeTruthy();
    expect(screen.getByText('~25 M EUR')).toBeTruthy();
    expect(screen.getByText('Astreintes')).toBeTruthy();
    expect(screen.getByText('18 000 EUR/infraction')).toBeTruthy();
    expect(
      screen.getByText('plafond 18 M EUR/route · 20 000 EUR/jour (piste 01)'),
    ).toBeTruthy();
  });

  it('badges estimated and unconfirmed amounts, and leaves official ones bare', () => {
    render(
      <BudgetTable
        heading="Budget estimé"
        value={[
          { label: 'Coût sanitaire', value: '>1 Mrd EUR/an', confidence: 'estimated' },
          { label: 'Dotation asbl', value: '607 000 EUR', confidence: 'unconfirmed' },
          { label: 'Amendes régionales', value: '32 M EUR', confidence: 'official' },
        ]}
        labels={LABELS}
      />,
    );

    expect(screen.getByText('(est.)')).toBeTruthy();
    expect(screen.getByText('(à confirmer)')).toBeTruthy();
    // Official is the unmarked default — a badge on it would dilute the signal.
    expect(screen.getAllByText('(est.)')).toHaveLength(1);
    expect(screen.getAllByText('(à confirmer)')).toHaveLength(1);
  });

  it('renders an unpublished budget as a muted statement with its reason', () => {
    render(
      <BudgetTable
        heading="Budget estimé"
        value={{
          status: 'unpublished',
          reason: 'Ni les redevances de concession ni les coûts communaux ne sont documentés.',
        }}
        labels={LABELS}
      />,
    );

    const statement = screen.getByText('Non publié');
    expect(statement).toBeTruthy();
    expect(statement.className).not.toMatch(/font-bold|text-xl/);
    expect(
      screen.getByText('Ni les redevances de concession ni les coûts communaux ne sont documentés.'),
    ).toBeTruthy();
  });

  it('renders a status with no reason without an empty paragraph', () => {
    const { container } = render(
      <BudgetTable heading="Budget estimé" value={{ status: 'not-applicable' }} labels={LABELS} />,
    );

    expect(screen.getByText('Sans objet')).toBeTruthy();
    expect(container.querySelectorAll('p:empty')).toHaveLength(0);
  });
});
