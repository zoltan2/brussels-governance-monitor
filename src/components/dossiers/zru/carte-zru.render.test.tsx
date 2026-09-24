// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// src/components/dossiers/zru/carte-zru.render.test.tsx
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ZruCarte2020_2026 } from './carte-zru';
import { SECTEURS_ENTRANTS, SECTEURS_SORTANTS } from './data/geometrie';

afterEach(() => cleanup());

describe('ZruCarte2020_2026', () => {
  it('trace les deux contours et les secteurs entrants et sortants', () => {
    const { container } = render(<ZruCarte2020_2026 />);
    expect(container.querySelectorAll('[data-couche="zru2020"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-couche="zru2026"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-couche="entrant"]')).toHaveLength(SECTEURS_ENTRANTS.length);
    expect(container.querySelectorAll('[data-couche="sortant"]')).toHaveLength(SECTEURS_SORTANTS.length);
  });

  it('entrants et sortants se distinguent par un motif, pas seulement la couleur', () => {
    const { container } = render(<ZruCarte2020_2026 />);
    const e = container.querySelector('[data-couche="entrant"]')!;
    const s = container.querySelector('[data-couche="sortant"]')!;
    expect(e.getAttribute('fill')).toMatch(/url\(#/);
    expect(e.getAttribute('fill')).not.toBe(s.getAttribute('fill'));
  });

  it('contour 2026 en tirets sur halo, fill-rule evenodd', () => {
    const { container } = render(<ZruCarte2020_2026 />);
    const z = container.querySelectorAll('[data-couche="zru2026"]')[0];
    expect(z.getAttribute('stroke-dasharray')).toBeTruthy();
    expect(z.getAttribute('fill-rule')).toBe('evenodd');
    expect(container.querySelector('[data-couche="halo2026"]')).toBeTruthy();
  });

  it('le tableau liste les surfaces 2020 et 2026 dans la locale (allemand : km², "Quelle")', () => {
    const { container } = render(<ZruCarte2020_2026 locale="de" />);
    expect(container.querySelector('details table')?.textContent).toMatch(/km²/);
    expect(container.textContent).toMatch(/Quelle/);
  });

  it('les surfaces suivent la convention locale française : virgule décimale', () => {
    const { container } = render(<ZruCarte2020_2026 locale="fr" />);
    const cellules = Array.from(container.querySelectorAll('details td')).map((td) => td.textContent);
    // Les deux surfaces (30,68 et 27,82) sont formatées avec une virgule, jamais un point.
    expect(cellules.some((c) => /\d,\d{2}/.test(c ?? ''))).toBe(true);
    expect(cellules.some((c) => /\d\.\d{2}/.test(c ?? ''))).toBe(false);
  });

  it("les identifiants de motif SVG sont dérivés de l'idBase, pour rester uniques sur une page à plusieurs figures", () => {
    const { container } = render(<ZruCarte2020_2026 />);
    const entrantFill = container.querySelector('[data-couche="entrant"]')!.getAttribute('fill')!;
    const sortantFill = container.querySelector('[data-couche="sortant"]')!.getAttribute('fill')!;
    expect(entrantFill).toBe('url(#zru-carte-2020-2026-motif-entrant)');
    expect(sortantFill).toBe('url(#zru-carte-2020-2026-motif-sortant)');
    expect(container.querySelector('#zru-carte-2020-2026-motif-entrant')).not.toBeNull();
    expect(container.querySelector('#zru-carte-2020-2026-motif-sortant')).not.toBeNull();
  });

  it("le tableau associe le bon décompte de secteurs à chaque périmètre (pas d'inversion entrants/sortants)", () => {
    const { container } = render(<ZruCarte2020_2026 locale="fr" />);
    const lignes = Array.from(container.querySelectorAll('details tbody tr'));
    const ligne2020 = lignes.find((tr) => tr.textContent?.includes('ZRU 2020'))!;
    const ligne2026 = lignes.find((tr) => tr.textContent?.includes('ZRU 2026'))!;
    expect(ligne2020.textContent).toContain(`${SECTEURS_SORTANTS.length} sortants`);
    expect(ligne2026.textContent).toContain(`${SECTEURS_ENTRANTS.length} entrants`);
  });

  it('la légende visuelle (motifs et tirets) est rendue en HTML dans la figure, avec du texte à côté de chaque pastille', () => {
    const { container } = render(<ZruCarte2020_2026 locale="fr" />);
    const legende = container.querySelector('figure ul')!;
    expect(legende).not.toBeNull();
    const items = legende.querySelectorAll('li');
    expect(items).toHaveLength(4);
    for (const li of Array.from(items)) {
      const pastille = li.querySelector('svg')!;
      expect(pastille.getAttribute('aria-hidden')).toBe('true');
      expect(li.textContent?.trim().length).toBeGreaterThan(0);
    }
    expect(legende.textContent).toMatch(/ZRU 2020/);
    expect(legende.textContent).toMatch(/ZRU 2026/);
    expect(legende.textContent).toMatch(/entrants/);
    expect(legende.textContent).toMatch(/sortants/);
  });

  it("aucun texte n'apparaît dans le grand SVG (titre et desc exceptés)", () => {
    const { container } = render(<ZruCarte2020_2026 />);
    const grandSvg = container.querySelector('figure > svg')!;
    expect(grandSvg.querySelectorAll('text')).toHaveLength(0);
  });
});
