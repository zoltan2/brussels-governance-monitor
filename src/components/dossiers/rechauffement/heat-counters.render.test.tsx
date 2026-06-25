// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { RechauffementHeatCounters } from './heat-counters';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

afterEach(() => cleanup());

describe('RechauffementHeatCounters', () => {
  it('rend sans erreur et contient un <figure>', () => {
    const { container } = render(<RechauffementHeatCounters />);
    expect(container.querySelector('figure')).toBeTruthy();
  });

  it('contient les 5 compteurs avec leurs qualificatifs', () => {
    const { container } = render(<RechauffementHeatCounters />);
    const text = container.textContent ?? '';
    // Compteur 1 : +10 avec degre
    expect(text).toMatch(/\+10/);
    expect(text).toMatch(/°C|ilot de chaleur/i);
    // Compteur 2 : 20 jours
    expect(text).toMatch(/20/);
    expect(text).toMatch(/jours|30\s*°C/i);
    // Compteur 3 : 62 000 arbres
    expect(text).toMatch(/62[\s ]?000/);
    expect(text).toMatch(/arbres|autoris/i);
    // Compteur 4 : 0 piscine (valeur "0" presente, accompagnee du label "piscine")
    expect(text).toMatch(/(?:^|[^0-9])0(?:[^0-9]|$)/);
    expect(text).toMatch(/piscine/i);
    // Compteur 5 : 2 291 deces
    expect(text).toMatch(/2[\s ]?291/);
    expect(text).toMatch(/dec[eè]s|surmortalit/i);
  });

  it('assertion anti-chiffre nu : les nombres sont accompagnes de leur qualificatif', () => {
    const { container } = render(<RechauffementHeatCounters />);
    const text = container.textContent ?? '';

    // "10" doit etre accompagne de "°C"
    const idx10 = text.indexOf('+10');
    if (idx10 !== -1) {
      const surrounding = text.slice(Math.max(0, idx10 - 5), idx10 + 20);
      expect(surrounding).toMatch(/°C/);
    }

    // "62 000" ou "62000" doit etre accompagne de "autoris" ou "selon"
    const idx62 = text.search(/62[\s ]?000/);
    if (idx62 !== -1) {
      const surrounding = text.slice(Math.max(0, idx62 - 20), idx62 + 50);
      expect(surrounding).toMatch(/autoris|selon|arbres/i);
    }

    // "0" compteur piscine doit etre accompagne de "piscine" dans le texte total
    expect(text).toMatch(/piscine/i);
    expect(text).toMatch(/(?:^|[^0-9])0(?:[^0-9]|$)/);
  });

  it('la carte des quartiers chauds est accessible (figure avec aria-labelledby)', () => {
    const { container } = render(<RechauffementHeatCounters />);
    const figures = container.querySelectorAll('figure');
    expect(figures.length).toBeGreaterThan(0);
    figures.forEach((fig) => {
      const labelledById = fig.getAttribute('aria-labelledby');
      expect(labelledById).toBeTruthy();
      const caption = container.querySelector(`#${labelledById}`);
      expect(caption).toBeTruthy();
    });
  });

  it('contient les 4 communes les plus chaudes', () => {
    const { container } = render(<RechauffementHeatCounters />);
    const text = container.textContent ?? '';
    expect(text).toMatch(/Saint-Josse/i);
    expect(text).toMatch(/Molenbeek/i);
    expect(text).toMatch(/Schaerbeek/i);
    expect(text).toMatch(/Koekelberg/i);
  });

  it('mentionne la source Statbel', () => {
    const { container } = render(<RechauffementHeatCounters />);
    expect(container.textContent).toMatch(/Statbel/i);
  });

  it("n'utilise aucune classe Tailwind dark:", () => {
    const { container } = render(<RechauffementHeatCounters />);
    const allElements = container.querySelectorAll('[class]');
    allElements.forEach((el) => {
      const cls = el.getAttribute('class') ?? '';
      expect(cls).not.toMatch(/\bdark:/);
    });
  });

  it('a pas de violations axe', async () => {
    const { container } = render(<RechauffementHeatCounters />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('locale="nl" affiche les traductions neerlandaises', () => {
    const { container } = render(<RechauffementHeatCounters locale="nl" />);
    const text = container.textContent ?? '';
    // Compteur 1 : hitte-eiland
    expect(text).toMatch(/hitte-eiland/i);
    // Compteur 3 : velvergunningen
    expect(text).toMatch(/velvergunningen/i);
    // Compteur 4 : openluchtzwembad
    expect(text).toMatch(/openluchtzwembad/i);
    // Communes : NL noms
    expect(text).toMatch(/Sint-Joost-ten-Node/i);
    expect(text).toMatch(/Sint-Jans-Molenbeek/i);
    expect(text).toMatch(/Schaarbeek/i);
    // Legende : Statbel toujours present
    expect(text).toMatch(/Statbel/i);
    // Confiance : NL
    expect(text).toMatch(/officieel/i);
  });
});
