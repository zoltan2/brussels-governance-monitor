// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup, fireEvent } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}));

// `@/i18n/navigation` appelle createNavigation(routing), qui importe `next/navigation`
// en ESM : hors bundle Next, la résolution échoue (« Did you mean next/navigation.js ? »)
// et la suite entière ne se charge pas. Même nature que l'inline de next-auth déjà
// prévu dans vitest.config.ts. Un <a> suffit : ce test porte sur le panneau, pas sur
// la localisation des routes.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}));

// jsdom n'implémente pas IntersectionObserver, dont dépend le chargement paresseux
// de la question du jour, montée à l'intérieur du panneau. Sans ce bouchon, le seul
// fait d'ouvrir le panneau lève une exception.
beforeAll(() => {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds = [];
  } as unknown as typeof IntersectionObserver;

  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ questions: [] }),
  })) as unknown as typeof fetch;
});

import { GamesPanel } from './games-panel';

afterEach(cleanup);

const onglet = () => document.querySelector<HTMLButtonElement>('button[aria-label="protoGamesTab"]')!;

describe('GamesPanel — onglet et panneau', () => {
  it("expose un onglet nommé, replié à l'ouverture de la page", () => {
    render(<GamesPanel locale="fr" />);
    expect(onglet()).not.toBeNull();
    expect(onglet().getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('ouvre un dialogue modal porté par un portail sur <body>', () => {
    // Le panneau doit sortir de son parent : l'entête porte un backdrop-filter, qui
    // créerait un bloc conteneur pour un position:fixed rendu sur place.
    const { container } = render(<GamesPanel locale="fr" />);
    fireEvent.click(onglet());

    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(container.contains(dialog)).toBe(false);
  });

  it('ferme le panneau sur Échap et rend le focus à l’onglet', () => {
    render(<GamesPanel locale="fr" />);
    fireEvent.click(onglet());
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(onglet());
  });

  it('dans un champ rempli, le premier Échap garde la saisie et le focus dans la modale ; le second ferme', () => {
    // Constat F6 de l'équipe rouge : Échap dans l'adresse d'inscription fermait tout
    // le panneau et jetait la saisie.
    render(<GamesPanel locale="fr" />);
    fireEvent.click(onglet());
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    const champ = document.createElement('input');
    champ.value = 'lecteur@exemple.be';
    dialog.append(champ);
    champ.focus();

    fireEvent.keyDown(champ, { key: 'Escape' });
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(champ.value).toBe('lecteur@exemple.be');
    expect(document.activeElement).toBe(dialog);

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('rétablit le défilement de la page à la fermeture', () => {
    render(<GamesPanel locale="fr" />);
    fireEvent.click(onglet());
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('propose trois onglets en français, dont un seul sélectionné', () => {
    render(<GamesPanel locale="fr" />);
    fireEvent.click(onglet());

    const tabs = document.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(3);
    expect(document.querySelectorAll('[role="tab"][aria-selected="true"]').length).toBe(1);
  });

  it("n'offre pas le Stuut hors du français, ce jeu n'existant qu'en français", () => {
    render(<GamesPanel locale="nl" />);
    fireEvent.click(onglet());

    const labels = [...document.querySelectorAll('[role="tab"]')].map((t) => t.textContent);
    expect(labels.some((l) => /Stuut/i.test(l ?? ''))).toBe(false);
    expect(document.querySelectorAll('[role="tab"]').length).toBe(2);
  });

  it('change de panneau à la flèche droite, comme le veut le motif ARIA tabs', () => {
    render(<GamesPanel locale="fr" />);
    fireEvent.click(onglet());

    const premier = document.querySelector('[role="tab"][aria-selected="true"]')!;
    fireEvent.keyDown(document.querySelector('[role="tablist"]')!, { key: 'ArrowRight' });
    const apres = document.querySelector('[role="tab"][aria-selected="true"]')!;

    expect(apres).not.toBe(premier);
  });

  it("n'expose qu'un seul panneau d'onglet à la fois", () => {
    render(<GamesPanel locale="fr" />);
    fireEvent.click(onglet());

    const panneaux = [...document.querySelectorAll('[role="tabpanel"]')];
    const visibles = panneaux.filter((p) => !p.className.includes('hidden'));
    expect(visibles.length).toBe(1);
  });

  it('fait entrer le focus dans la modale à l’ouverture', () => {
    // aria-modal="true" est un mensonge tant que le focus reste dehors : le piège
    // de focus ne s'arme qu'une fois à l'intérieur, et Maj+Tab repartait dans la page.
    render(<GamesPanel locale="fr" />);
    fireEvent.click(onglet());

    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('rend le reste de la page inerte pendant l’ouverture, puis le restitue', () => {
    render(<GamesPanel locale="fr" />);
    fireEvent.click(onglet());

    const dialog = document.querySelector('[role="dialog"]')!;
    const portail = dialog.parentElement;
    const voisins = [...document.body.children].filter((el) => el !== portail);
    expect(voisins.length).toBeGreaterThan(0);
    expect(voisins.every((el) => el.hasAttribute('inert'))).toBe(true);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect([...document.body.children].some((el) => el.hasAttribute('inert'))).toBe(false);
  });

  it("n'a aucune violation d'accessibilité, panneau ouvert", async () => {
    render(<GamesPanel locale="fr" />);
    fireEvent.click(onglet());
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
