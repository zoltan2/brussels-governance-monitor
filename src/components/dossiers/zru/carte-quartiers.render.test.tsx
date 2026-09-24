// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// src/components/dossiers/zru/carte-quartiers.render.test.tsx
import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { afterEach, describe, expect, it } from 'vitest';
import { ZruCarteQuartiers } from './carte-quartiers';
import { QUARTIERS_VALEURS } from './data/quartiers';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);
afterEach(() => cleanup());
const sans = QUARTIERS_VALEURS.filter((q) => q.valeur === null);

describe('ZruCarteQuartiers', () => {
  it('un polygone par quartier (145)', () => {
    const { container } = render(<ZruCarteQuartiers />);
    expect(container.querySelectorAll('[data-md-id]')).toHaveLength(145);
  });

  it('quartier sans donnée : motif hachuré, jamais un palier de couleur', () => {
    const { container } = render(<ZruCarteQuartiers />);
    for (const q of sans) {
      const el = container.querySelector(`[data-md-id="${q.mdId}"]`)!;
      expect(el.getAttribute('fill')).toBe('url(#zru-carte-quartiers-sans-donnee)');
      expect(el.getAttribute('class') ?? '').not.toMatch(/fill-choro/);
    }
  });

  it('le tableau dit « sans donnée » en texte et donne le palier en texte', () => {
    const { container } = render(<ZruCarteQuartiers />);
    const t = container.querySelector('details table')!.textContent!;
    expect(t).toMatch(/sans donnée/);
    expect(t).toMatch(/palier \d sur 5/);
  });

  it('aucun nom de quartier dans le SVG', () => {
    const { container } = render(<ZruCarteQuartiers />);
    expect(
      container
        .querySelector('svg')!
        .textContent!.replace(container.querySelector('svg title')!.textContent!, '')
        .replace(container.querySelector('svg desc')!.textContent!, ''),
    ).toBe('');
  });

  it('légende avec les bornes des paliers au format de la langue', () => {
    const { container } = render(<ZruCarteQuartiers locale="en" />);
    expect(container.querySelector('[data-legende]')!.textContent).toMatch(/\d/);
    expect(container.textContent).toMatch(/no data/);
  });

  it("le tableau n'est jamais trié par valeur : les lignes suivent l'ordre alphabétique du nom local", () => {
    const { container } = render(<ZruCarteQuartiers locale="fr" />);
    const nomsRendus = Array.from(container.querySelectorAll('details tbody tr td:first-child')).map(
      (td) => td.textContent ?? '',
    );

    // Les deux premières lignes sont dans l'ordre alphabétique.
    expect(nomsRendus[0]!.localeCompare(nomsRendus[1]!, 'fr') <= 0).toBe(true);

    // L'ordre complet est celui du nom (fr), jamais celui de la valeur : un tri par valeur
    // placerait Stockel (26 303, palier 5) ou un quartier sans donnée en tête ou en fin,
    // jamais à sa place alphabétique.
    const nomsAttendus = [...QUARTIERS_VALEURS].map((q) => q.nom.fr).sort((a, b) => a.localeCompare(b, 'fr'));
    expect(nomsRendus).toEqual(nomsAttendus);
  });

  it('quartier sans donnée : le texte explique « non habités » (libellé du Monitoring des Quartiers)', () => {
    const { container } = render(<ZruCarteQuartiers locale="fr" />);
    expect(container.querySelector('svg desc')!.textContent).toMatch(/non habités/);
  });

  it('le motif « sans donnée » porte le trait et le fond vérifiés par globals.contrast.test.ts (neutral-600 sur neutral-100)', () => {
    const { container } = render(<ZruCarteQuartiers />);
    const pattern = container.querySelector('pattern#zru-carte-quartiers-sans-donnee')!;
    const trait = pattern.querySelector('path')!;
    const fond = pattern.querySelector('rect')!;
    expect(trait.getAttribute('class') ?? '').toMatch(/stroke-neutral-600/);
    expect(fond.getAttribute('class') ?? '').toMatch(/fill-neutral-100/);
  });

  it("les valeurs sont arrondies à l'euro entier (aucune décimale) et l'unité € est dans l'en-tête de colonne", () => {
    const { container } = render(<ZruCarteQuartiers locale="fr" />);
    const entetes = Array.from(container.querySelectorAll('details thead th')).map((th) => th.textContent ?? '');
    expect(entetes.some((h) => h.includes('€'))).toBe(true);
    const valeurs = Array.from(container.querySelectorAll('details tbody tr td:nth-child(2)')).map(
      (td) => td.textContent ?? '',
    );
    expect(valeurs.length).toBeGreaterThan(0);
    // Convention fr-BE : la virgule ne marque qu'une décimale. Arrondies à l'euro, les valeurs
    // n'en portent plus jamais (le séparateur de milliers est une espace, jamais une virgule).
    for (const v of valeurs) expect(v).not.toMatch(/\d,\d/);
  });

  it('chaque polygone avec valeur porte la classe littérale de son palier (fill-choro-1 à 5), jamais une classe assemblée', () => {
    const { container } = render(<ZruCarteQuartiers />);
    for (const q of QUARTIERS_VALEURS.filter((x) => x.palier !== null)) {
      const cls = container.querySelector(`[data-md-id="${q.mdId}"]`)!.getAttribute('class') ?? '';
      expect(cls.split(' ')).toContain(`fill-choro-${q.palier}`);
    }
  });

  it('légende du contour : « ZRU 2026 » seul, sans qualification non sourcée', () => {
    for (const locale of ['fr', 'nl', 'en', 'de'] as const) {
      const { container } = render(<ZruCarteQuartiers locale={locale} />);
      expect(container.querySelector('[data-legende]')!.textContent).not.toMatch(/investissement|investering|investment|Investition/i);
      cleanup();
    }
  });

  it('passe axe', async () => {
    const { container } = render(<ZruCarteQuartiers />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

// Vérification des faits du 24/09/2026 : l'indicateur 2498 porte sur l'année de
// revenus 2023 ; la légende doit le dire dans chaque langue.
describe('ZruCarteQuartiers : année de revenus dans la légende', () => {
  it.each([
    ['fr', 'revenus 2023'],
    ['nl', 'inkomens 2023'],
    ['en', '2023 income'],
    ['de', 'Einkommen 2023'],
  ] as const)('%s : « %s »', (locale, attendu) => {
    const { container } = render(<ZruCarteQuartiers locale={locale} />);
    expect(container.querySelector('figcaption')!.textContent).toContain(attendu);
  });
});
