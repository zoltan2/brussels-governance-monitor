// @vitest-environment jsdom
// src/components/dossiers/zru/communes-rangs.render.test.tsx
import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { afterEach, describe, expect, it } from 'vitest';
import { ZruCommunesRangs, calculerRangs } from './communes-rangs';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);
afterEach(() => cleanup());

describe('ZruCommunesRangs', () => {
  it('deux périodes séparées par la rupture de 2020, aucune ligne ne relie 2019 à 2020', () => {
    const { container } = render(<ZruCommunesRangs />);
    expect(container.querySelectorAll('[data-periode]')).toHaveLength(2);
    expect(container.querySelector('[data-periode="2015-2019"] [data-annee="2020"]')).toBeNull();
    expect(container.textContent).toMatch(/rupture/i);
  });

  it('Ixelles : « non disponible » avant 2020, jamais 0', () => {
    const { container } = render(<ZruCommunesRangs />);
    const l = container.querySelector('[data-periode="2015-2019"] [data-niscode="21009"]')!;
    expect(l.textContent).toMatch(/non disponible/);
    expect(l.textContent).not.toMatch(/(^|\D)0(\D|$)/);
  });

  it('les valeurs sous réserve portent la mention en texte', () => {
    const { container } = render(<ZruCommunesRangs />);
    expect(container.textContent).toMatch(/avec prudence/);
  });

  it('néerlandais : toponymes néerlandais', () => {
    const { container } = render(<ZruCommunesRangs locale="nl" />);
    expect(container.textContent).toMatch(/Elsene/);
  });

  it('le sens du rang est explicite : « rang X sur N » et une phrase indiquant que 1 = le plus élevé', () => {
    const { container } = render(<ZruCommunesRangs />);
    expect(container.textContent).toMatch(/rang \d+ sur \d+/);
    expect(container.textContent).toMatch(/Rang 1.*plus élevé/i);
  });

  it('N (effectif du classement) vaut 18 en 2015 (Ixelles indisponible) et 19 en 2023 (toutes les communes)', () => {
    const { container } = render(<ZruCommunesRangs />);
    // Anderlecht (première ligne) a une valeur en 2015 comme en 2023.
    const ligneAnderlecht2015 = container.querySelector('[data-periode="2015-2019"] [data-niscode="21001"] [data-annee="2015"]')!;
    expect(ligneAnderlecht2015.textContent).toMatch(/sur 18/);

    const ligneAnderlecht2023 = container.querySelector('[data-periode="2020-2023"] [data-niscode="21001"] [data-annee="2023"]')!;
    expect(ligneAnderlecht2023.textContent).toMatch(/sur 19/);
  });

  it("l'ordre des lignes est identique dans les deux tableaux et ne dépend pas des valeurs (ordre fixe des communes)", () => {
    const { container } = render(<ZruCommunesRangs />);
    const ordre2015 = Array.from(container.querySelectorAll('[data-periode="2015-2019"] tbody tr')).map((tr) =>
      tr.getAttribute('data-niscode'),
    );
    const ordre2020 = Array.from(container.querySelectorAll('[data-periode="2020-2023"] tbody tr')).map((tr) =>
      tr.getAttribute('data-niscode'),
    );
    expect(ordre2015).toEqual(ordre2020);
    // Ordre croissant du code NIS (21001 → 21019), jamais trié par rang ou valeur.
    expect(ordre2015).toEqual([...ordre2015].sort());
  });

  it('chaque tableau est dans une région focalisable avec un nom accessible, caption et th scope', () => {
    const { container } = render(<ZruCommunesRangs />);
    const regions = container.querySelectorAll('[role="region"]');
    expect(regions).toHaveLength(2);
    for (const region of Array.from(regions)) {
      expect(region.getAttribute('aria-label')).toBeTruthy();
      expect(region.getAttribute('tabindex')).toBe('0');
    }
    expect(container.querySelectorAll('table caption')).toHaveLength(2);
    expect(container.querySelectorAll('th[scope="col"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('th[scope="row"]').length).toBeGreaterThan(0);
  });

  it('passe axe', async () => {
    const { container } = render(<ZruCommunesRangs />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('calculerRangs (fonction pure)', () => {
  it('rang 1 = valeur la plus élevée', () => {
    const rangs = calculerRangs([
      { niscode: 'a', valeur: 10 },
      { niscode: 'b', valeur: 30 },
      { niscode: 'c', valeur: 20 },
    ]);
    expect(rangs.get('b')).toBe(1);
    expect(rangs.get('c')).toBe(2);
    expect(rangs.get('a')).toBe(3);
  });

  it('égalité : rang de compétition standard (1, 1, 3), jamais 1, 2, 3 ni 1, 1, 2', () => {
    const rangs = calculerRangs([
      { niscode: 'a', valeur: 30 },
      { niscode: 'b', valeur: 30 },
      { niscode: 'c', valeur: 20 },
    ]);
    expect(rangs.get('a')).toBe(1);
    expect(rangs.get('b')).toBe(1);
    expect(rangs.get('c')).toBe(3);
  });

  it('les communes sans valeur sont exclues du classement', () => {
    const rangs = calculerRangs([
      { niscode: 'a', valeur: 10 },
      { niscode: 'b', valeur: null },
      { niscode: 'c', valeur: 20 },
    ]);
    expect(rangs.has('b')).toBe(false);
    expect(rangs.size).toBe(2);
  });

  it('pourcentage : espace insécable avant % en français, néerlandais et allemand, aucune espace en anglais', () => {
    for (const [locale, motif] of [['fr', /\d\u00a0%/], ['nl', /\d\u00a0%/], ['de', /\d\u00a0%/], ['en', /\d%/]] as const) {
      const { container } = render(<ZruCommunesRangs locale={locale} />);
      const cellule = container.querySelector('[data-periode="2020-2023"] td')!.textContent!;
      expect(cellule).toMatch(motif);
      expect(cellule).not.toMatch(/\d %/);
      cleanup();
    }
  });

  it('les deux régions sont nommées sans ambiguïté : titre de la figure puis période', () => {
    const { container } = render(<ZruCommunesRangs />);
    const noms = Array.from(container.querySelectorAll('[role="region"]')).map((r) => r.getAttribute('aria-label'));
    expect(noms[0]).toMatch(/^Taux de pauvreté administratif des 19 communes.*de 2015 à 2019$/);
    expect(noms[1]).toMatch(/de 2020 à 2023$/);
    expect(container.querySelector('figure')!.getAttribute('aria-labelledby')).toBe('zru-communes-rangs-titre');
  });
});
