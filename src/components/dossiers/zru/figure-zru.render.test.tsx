// @vitest-environment jsdom
// src/components/dossiers/zru/figure-zru.render.test.tsx
import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { afterEach, describe, expect, it } from 'vitest';
import { FigureZru } from './figure-zru';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);
afterEach(() => cleanup());

const props = {
  idBase: 'test-fig', locale: 'nl' as const, titre: 'Titel', indicateur: 'Mediaan belastbaar inkomen', periode: '2023',
  provenance: { producteur: 'BISA', url: 'https://monitoringdesquartiers.brussels/Indicator/IndicatorPage/2498', sourceMiseAJour: null, extraitLe: '2026-09-24', licence: 'Vrij hergebruik met bronvermelding', modifications: [], confiance: 'official' as const },
  resumeSvg: 'Kaart van 145 wijken',
  svg: <svg viewBox="0 0 10 10"><path d="M0 0L1 1Z" /></svg>,
  tableau: { caption: 'Waarden', colonnes: ['Wijk', 'Waarde'], lignes: [['A', 1]] },
};

describe('FigureZru', () => {
  it('le figcaption porte indicateur, période, source et date d\'extraction', () => {
    const { container } = render(<FigureZru {...props} />);
    const cap = container.querySelector('figcaption')!.textContent!;
    for (const s of ['Mediaan belastbaar inkomen', '2023', 'BISA', '2026-09-24']) expect(cap).toContain(s);
  });
  it('aucun texte dans le SVG hormis title et desc', () => {
    const { container } = render(<FigureZru {...props} />);
    expect(container.querySelectorAll('svg text')).toHaveLength(0);
    expect(container.querySelector('svg title')?.textContent).toBe('Titel');
  });
  it('le tableau équivalent est dans un details, avec caption et en-têtes de colonne', () => {
    const { container } = render(<FigureZru {...props} />);
    expect(container.querySelector('details table caption')?.textContent).toBe('Waarden');
    expect(container.querySelectorAll('details th[scope="col"]')).toHaveLength(2);
  });
  it('libellés dans la locale passée (néerlandais), pas de français', () => {
    const { container } = render(<FigureZru {...props} />);
    expect(container.textContent).not.toMatch(/Source|Données|extrait/);
  });
  it('passe axe', async () => {
    const { container } = render(<FigureZru {...props} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
