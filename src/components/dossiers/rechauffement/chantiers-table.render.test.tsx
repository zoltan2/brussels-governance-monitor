// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { RechauffementChantiersTable } from './chantiers-table';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

afterEach(() => cleanup());

describe('RechauffementChantiersTable', () => {
  it('rend sans erreur et contient un <figure>', () => {
    const { container } = render(<RechauffementChantiersTable />);
    expect(container.querySelector('figure')).toBeTruthy();
  });

  it('contient les libelles des chantiers principaux', () => {
    const { getAllByText } = render(<RechauffementChantiersTable />);
    // Mobile + desktop rendent chaque ligne deux fois : on utilise getAllByText
    expect(getAllByText(/Schuman/i).length).toBeGreaterThan(0);
    expect(getAllByText(/Mediapark/i).length).toBeGreaterThan(0);
    expect(getAllByText(/Toison d'Or/i).length).toBeGreaterThan(0);
    expect(getAllByText(/Josaphat/i).length).toBeGreaterThan(0);
  });

  it('le tableau est accessible : figure avec aria-labelledby, th avec scope', () => {
    const { container } = render(<RechauffementChantiersTable />);
    const figure = container.querySelector('figure');
    expect(figure).toBeTruthy();
    const labelledById = figure!.getAttribute('aria-labelledby');
    expect(labelledById).toBeTruthy();
    const caption = container.querySelector(`#${labelledById}`);
    expect(caption).toBeTruthy();
    const thElements = container.querySelectorAll('th[scope]');
    expect(thElements.length).toBeGreaterThan(0);
  });

  it('les chiffres sont toujours accompagnes de leur qualificatif (pas de chiffre nu)', () => {
    const { container } = render(<RechauffementChantiersTable />);
    const text = container.textContent ?? '';
    // "42" doit apparaitre avec "M€"
    const idx42 = text.indexOf('42');
    if (idx42 !== -1) {
      const surrounding = text.slice(Math.max(0, idx42 - 5), idx42 + 10);
      expect(surrounding).toMatch(/M€/);
    }
    // "1 000" ou "1000" doit apparaitre avec "~" ou "selon"
    const idx1000 = text.search(/1[\s ]?000/);
    if (idx1000 !== -1) {
      const surrounding = text.slice(Math.max(0, idx1000 - 10), idx1000 + 20);
      expect(surrounding).toMatch(/~|selon/i);
    }
  });

  it("n'utilise aucune classe Tailwind dark:", () => {
    const { container } = render(<RechauffementChantiersTable />);
    const allElements = container.querySelectorAll('[class]');
    allElements.forEach((el) => {
      const cls = el.getAttribute('class') ?? '';
      expect(cls).not.toMatch(/\bdark:/);
    });
  });

  it('contient la note de bas de tableau sur les arbres abattus', () => {
    const { container } = render(<RechauffementChantiersTable />);
    expect(container.textContent).toMatch(/62[\s ]?000|Help4Trees|IEB/i);
  });

  it('a pas de violations axe', async () => {
    const { container } = render(<RechauffementChantiersTable />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('avec locale="nl" affiche des libelles NL connus', () => {
    const { container } = render(<RechauffementChantiersTable locale="nl" />);
    const text = container.textContent ?? '';
    // Noms propres NL
    expect(text).toMatch(/Schaarbeek/i);
    // Libelle de confiance NL
    expect(text).toMatch(/geschat/i);
    // Note de bas NL
    expect(text).toMatch(/Help4Trees|IEB/i);
    expect(text).toMatch(/62[\s ]?000/);
  });

  it('les badges de confiance portent un aria-label contextuel en FR (locale par defaut)', () => {
    const { container } = render(<RechauffementChantiersTable />);
    const badge = container.querySelector('[aria-label*="Niveau de confiance"]');
    expect(badge).toBeTruthy();
  });

  it('les badges de confiance portent un aria-label contextuel en EN (locale="en")', () => {
    const { container } = render(<RechauffementChantiersTable locale="en" />);
    const badge = container.querySelector('[aria-label*="Confidence level"]');
    expect(badge).toBeTruthy();
  });
});
