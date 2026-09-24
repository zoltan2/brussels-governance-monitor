// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// src/components/dossiers/zru/carte-quartiers.render.test.tsx
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ZruCarteQuartiers } from './carte-quartiers';
import { QUARTIERS_VALEURS } from './data/quartiers';

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

  it('quartier sans donnée : le texte explique « non habités ou trop peu peuplés »', () => {
    const { container } = render(<ZruCarteQuartiers locale="fr" />);
    expect(container.querySelector('svg desc')!.textContent).toMatch(/non habités ou trop peu peuplés/);
  });
});
