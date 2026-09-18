// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { act, render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

import { StuutGame } from './stuut-game';
import { CLE_STATS, STUUT_API_JOUR } from '@/lib/stuut';

const JOUR = {
  jour: '2026-09-18',
  numero: 95,
  mot: 'CABINET',
  definition: 'Équipe rapprochée qui entoure un ministre.',
  url: 'https://governance.brussels/fr/dossiers/reforme-administration',
  appat: 'CANTINE',
};

function repondre(corps: unknown, ok = true) {
  globalThis.fetch = vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => corps })) as unknown as typeof fetch;
}

/** Une lettre déjà jouée s'annonce avec son verdict (« C, bien placée ») : on vise le début du nom. */
function touche(nom: string) {
  const motif = nom.length === 1 ? new RegExp(`^${nom}(,|$)`) : nom;
  fireEvent.click(screen.getByRole('button', { name: motif }));
}

/** Tape un mot au clavier du jeu ; la première lettre est déjà offerte. */
function taper(mot: string) {
  for (const l of mot.slice(1)) touche(l);
  touche('Valider l’essai');
}

/**
 * Attend qu'un essai soit compté ET que le jeu soit déverrouillé. Le jeu reste
 * verrouillé jusqu'au setTimeout qui suit la validation (0 ms sans animation) :
 * une lettre tapée avant est ignorée, comme dans le jeu autonome. Sans cette
 * seconde attente, la suite complète, plus lente, faisait taper le test pendant
 * le verrou, et il attendait ensuite un essai qui ne venait jamais.
 */
async function attendreFinEssai(n: number) {
  await waitFor(() => expect(document.querySelectorAll('.sr-only ol li').length).toBe(n));
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  localStorage.clear();
  repondre(JOUR);
});
afterEach(cleanup);

describe('StuutGame', () => {
  it('lit le mot du jour sur l’API du Stuut, pas dans une copie locale', async () => {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    expect(globalThis.fetch).toHaveBeenCalledWith(STUUT_API_JOUR);
  });

  it('refuse un essai incomplet sans le compter', async () => {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    touche('A');
    touche('Valider l’essai');
    expect(await screen.findByText('Il manque des lettres', { selector: '[aria-live] , p' })).toBeTruthy();
    expect(document.querySelectorAll('ol li').length).toBe(0);
  });

  it('évalue un essai et l’annonce en toutes lettres', async () => {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    taper('CANTINE');
    const annonce = document.querySelector('[aria-live="polite"]')!;
    await waitFor(() => expect(annonce.textContent).toMatch(/Essai 1 sur 6 : CANTINE\. C bien placée, A bien placée, N ailleurs/));
  });

  it('salue le leurre du jour sans interrompre la partie', async () => {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    taper('CANTINE');
    expect(await screen.findByText(/CANTINE, le grand classique du genre/)).toBeTruthy();
    // La partie continue : le clavier est toujours là.
    await waitFor(() => expect(screen.getByRole('group', { name: 'Clavier du jeu' })).toBeTruthy());
  });

  it('révèle le mot, sa définition et un lien INTERNE vers le dossier après une victoire', async () => {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    taper('CABINET');

    expect(await screen.findByText('Du premier coup. Chapeau, vraiment.')).toBeTruthy();
    expect(screen.getByText(/Équipe rapprochée/)).toBeTruthy();
    const lien = screen.getByRole('link', { name: /Pour aller plus loin/ });
    expect(lien.getAttribute('href')).toBe('/fr/dossiers/reforme-administration');
    expect(lien.getAttribute('data-umami-event')).toBe('jeux-stuut-dossier');
    expect(screen.queryByRole('group', { name: 'Clavier du jeu' })).toBeNull();
  });

  it('enregistre la partie dans les statistiques locales', async () => {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    taper('CABINET');
    await screen.findByText('Du premier coup. Chapeau, vraiment.');

    const stats = JSON.parse(localStorage.getItem(CLE_STATS)!);
    expect(stats.played).toBe(1);
    expect(stats.dist[0]).toBe(1);
    expect(stats.today).toMatchObject({ day: 94, won: true, n: 1 });
  });

  it('perd après six essais et donne quand même le mot', async () => {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    for (let i = 0; i < 6; i++) {
      taper('CCCCCCC');
      await attendreFinEssai(i + 1);
    }
    expect(await screen.findByText('Celui-là était coriace.')).toBeTruthy();
    expect(screen.getByText(/Même les initiés sèchent parfois/)).toBeTruthy();
  });

  it('retrouve le résultat du jour au lieu d’un plateau rejouable', async () => {
    localStorage.setItem(
      CLE_STATS,
      JSON.stringify({ played: 1, wins: 1, streak: 1, max: 1, dist: [0, 1, 0, 0, 0, 0], lastDay: 94, today: { day: 94, won: true, n: 2, grid: '🟩' } }),
    );
    render(<StuutGame actif />);
    expect(await screen.findByText(/Vous avez déjà joué aujourd’hui/)).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Clavier du jeu' })).toBeNull();
  });

  it('ignore le clavier physique quand son onglet est masqué', async () => {
    const { rerender } = render(<StuutGame actif={false} />);
    await screen.findByText(/n°95/);
    fireEvent.keyDown(document, { key: 'a' });
    expect(document.querySelector('.sr-only p')!.textContent).toMatch(/Saisie en cours : C\./);

    rerender(<StuutGame actif />);
    fireEvent.keyDown(document, { key: 'a' });
    expect(document.querySelector('.sr-only p')!.textContent).toMatch(/Saisie en cours : CA\./);
  });

  it('prend le focus à la première lettre, pour que l’Entrée valide l’essai au lieu de fermer le panneau', async () => {
    // Reproduit le panneau : à l'ouverture, le focus est sur « Fermer ». Constaté au
    // navigateur le 18/09/2026 : mot tapé, Entrée, et le panneau se fermait.
    const { container } = render(
      <>
        <button type="button">Fermer</button>
        <StuutGame actif />
      </>,
    );
    await screen.findByText(/n°95/);
    const fermer = screen.getByRole('button', { name: 'Fermer' });
    fermer.focus();

    fireEvent.keyDown(fermer, { key: 'a' });

    const jeu = container.querySelector('[role="region"]')!;
    expect(jeu.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(fermer);
  });

  it('affiche une erreur avec un lien vers le jeu autonome si l’API échoue, puis réessaie', async () => {
    repondre({}, false);
    render(<StuutGame actif />);
    expect(await screen.findByText(/n'a pas pu être chargé/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /stuut\.governance\.brussels/ }).getAttribute('href')).toBe(
      'https://stuut.governance.brussels',
    );

    repondre(JOUR);
    touche('Réessayer');
    expect(await screen.findByText(/n°95/)).toBeTruthy();
  });

  it('refuse une réponse de forme inattendue', async () => {
    repondre({ questions: [] });
    render(<StuutGame actif />);
    expect(await screen.findByText(/n'a pas pu être chargé/)).toBeTruthy();
  });

  it("n'a aucune violation d'accessibilité, en cours de partie puis au résultat", async () => {
    const { container } = render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    taper('CANTINE');
    await attendreFinEssai(1);
    expect(await axe(container)).toHaveNoViolations();

    taper('CABINET');
    await screen.findByText('Tout en finesse.');
    fireEvent.click(screen.getByRole('button', { name: 'Mes statistiques' }));
    fireEvent.click(screen.getByRole('button', { name: 'Défier un ami' }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
