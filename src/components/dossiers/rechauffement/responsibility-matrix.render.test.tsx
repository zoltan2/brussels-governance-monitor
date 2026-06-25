// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { RechauffementResponsibilityMatrix } from './responsibility-matrix';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

afterEach(() => cleanup());

describe('RechauffementResponsibilityMatrix', () => {
  it('rend sans erreur et contient un <figure>', () => {
    const { container } = render(<RechauffementResponsibilityMatrix />);
    expect(container.querySelector('figure')).toBeTruthy();
  });

  it('contient les 5 niveaux de pouvoir comme en-tetes de colonnes', () => {
    const { getAllByText } = render(<RechauffementResponsibilityMatrix />);
    expect(getAllByText(/^UE$/i).length).toBeGreaterThan(0);
    expect(getAllByText(/Federal/i).length).toBeGreaterThan(0);
    expect(getAllByText(/Communautaire/i).length).toBeGreaterThan(0);
    expect(getAllByText(/Regional/i).length).toBeGreaterThan(0);
    expect(getAllByText(/Communal/i).length).toBeGreaterThan(0);
  });

  it('contient les 8 themes de lignes', () => {
    const { container } = render(<RechauffementResponsibilityMatrix />);
    const text = container.textContent ?? '';
    expect(text).toMatch(/canicule/i);
    expect(text).toMatch(/[ÉE]coles/i);
    expect(text).toMatch(/canop[eé]e/i);
    expect(text).toMatch(/Voitures/i);
    expect(text).toMatch(/isolation/i);
    expect(text).toMatch(/Eau/i);
    expect(text).toMatch(/Sans-abri/i);
    expect(text).toMatch(/Travail/i);
  });

  it('contient des cellules specifiques aux bons niveaux', () => {
    const { container } = render(<RechauffementResponsibilityMatrix />);
    const text = container.textContent ?? '';
    // Regional/Voitures: LEZ, Good Move
    expect(text).toMatch(/LEZ/);
    expect(text).toMatch(/Good Move/);
    // Federal/Travail: Code du bien-être au travail
    expect(text).toMatch(/bien-[eê]tre au travail/i);
    // Communautaire/Ecoles: FWB et VGC
    expect(text).toMatch(/FWB/);
    expect(text).toMatch(/VGC/);
    // Regional/Eau: Vivaqua
    expect(text).toMatch(/Vivaqua/);
  });

  it('a un aria-labelledby sur le figure pointant vers un element existant', () => {
    const { container } = render(<RechauffementResponsibilityMatrix />);
    const figure = container.querySelector('figure');
    expect(figure).toBeTruthy();
    const labelledById = figure!.getAttribute('aria-labelledby');
    expect(labelledById).toBeTruthy();
    const caption = container.querySelector(`#${labelledById}`);
    expect(caption).toBeTruthy();
  });

  it('contient des th avec attribut scope', () => {
    const { container } = render(<RechauffementResponsibilityMatrix />);
    const thElements = container.querySelectorAll('th[scope]');
    expect(thElements.length).toBeGreaterThan(0);
  });

  it("n'utilise aucune classe Tailwind dark:", () => {
    const { container } = render(<RechauffementResponsibilityMatrix />);
    const allElements = container.querySelectorAll('[class]');
    allElements.forEach((el) => {
      const cls = el.getAttribute('class') ?? '';
      expect(cls).not.toMatch(/\bdark:/);
    });
  });

  it('a pas de violations axe', async () => {
    const { container } = render(<RechauffementResponsibilityMatrix />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
