// @vitest-environment jsdom
// src/components/dossiers/zru/points-europe.render.test.tsx
import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { afterEach, describe, expect, it } from 'vitest';
import { ZruPointsEurope } from './points-europe';
import { EUROPE_RATIOS } from './data/europe';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);
afterEach(() => cleanup());

describe('ZruPointsEurope', () => {
  it('un point par région et une ligne de référence à 1', () => {
    const { container } = render(<ZruPointsEurope />);
    expect(container.querySelectorAll('[data-geo]')).toHaveLength(EUROPE_RATIOS.length);
    expect(container.querySelector('[data-reference="1"]')).toBeTruthy();
  });

  it('dit « calcul BGM » et « environ deux fois », jamais de rang', () => {
    const { container } = render(<ZruPointsEurope />);
    expect(container.textContent).toMatch(/calcul BGM/);
    expect(container.textContent).toMatch(/environ deux fois/);
    expect(container.textContent).not.toMatch(/\b1er\b|premier|classement/);
  });

  it('explique le sens du rapport', () => {
    const { container } = render(<ZruPointsEurope locale="en" />);
    expect(container.textContent).toMatch(/above 1/);
  });

  it('les lignes du tableau sont triées par ordre alphabétique du nom local, jamais par rapport', () => {
    const { container } = render(<ZruPointsEurope />);
    const noms = Array.from(container.querySelectorAll('details tbody tr td:first-child')).map((td) => td.textContent);

    const attenduAlphabetique = [...EUROPE_RATIOS].map((r) => r.nom.fr).sort((a, b) => a.localeCompare(b, 'fr'));
    expect(noms).toEqual(attenduAlphabetique);

    // Preuve de mutation : l'ordre par rapport (décroissant comme croissant) ne doit pas
    // correspondre à l'ordre affiché — sinon un tri par rapport aurait pu passer inaperçu.
    const parRatioDesc = [...EUROPE_RATIOS].sort((a, b) => b.ratio - a.ratio).map((r) => r.nom.fr);
    const parRatioAsc = [...EUROPE_RATIOS].sort((a, b) => a.ratio - b.ratio).map((r) => r.nom.fr);
    expect(noms).not.toEqual(parRatioDesc);
    expect(noms).not.toEqual(parRatioAsc);
  });

  it('aucun rang affiché : 4 colonnes seulement, et aucun nom de région dans le SVG', () => {
    const { container } = render(<ZruPointsEurope />);
    expect(container.querySelectorAll('details th[scope="col"]')).toHaveLength(4);
    const svg = container.querySelector('svg')!;
    for (const r of EUROPE_RATIOS) expect(svg.textContent).not.toContain(r.nom.fr);
  });

  it('le rapport de Bruxelles reste dans la fourchette 1,8-2,2 qui valide « environ deux fois » / « about twice »', () => {
    const be10 = EUROPE_RATIOS.find((r) => r.geo === 'BE10');
    const dansLaFourchette = be10 !== undefined && be10.ratio >= 1.8 && be10.ratio <= 2.2;
    expect(
      dansLaFourchette,
      `le rapport de Bruxelles (${be10?.ratio}) est hors de la fourchette 1,8-2,2 : la phrase fixe « environ deux fois » / « about twice » doit être revue avant de republier.`,
    ).toBe(true);
  });

  it('passe axe', async () => {
    const { container } = render(<ZruPointsEurope />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
