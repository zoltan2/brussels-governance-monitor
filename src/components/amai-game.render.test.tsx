// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
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

import { AmaiGame } from './amai-game';

// Cinq questions : la réponse juste est « plus » pour les paires, « moins » pour les impaires.
const PARTIE = {
  date: '2026-09-18',
  questions: [0, 1, 2, 3, 4].map((i) => ({
    id: i + 1,
    anchor: 100,
    real: i % 2 === 0 ? 150 : 90,
    unit: 'pct',
    tag: 'inst',
    source_url: i === 0 ? 'https://governance.brussels/fr/engagements' : 'https://statbel.fgov.be/x',
    question: `Question ${i + 1}`,
    ctx: `Contexte ${i + 1}`,
  })),
};

let appels: { url: string; init?: RequestInit }[] = [];

function repondre(daily: unknown, ok = true) {
  appels = [];
  globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    appels.push({ url, init });
    if (url.includes('/api/plays')) return { ok: true, json: async () => ({ percentile: 72 }) };
    return { ok, status: ok ? 200 : 500, json: async () => daily };
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  localStorage.clear();
  repondre(PARTIE);
});
afterEach(cleanup);

async function jouerTout(bonnes: boolean) {
  for (let i = 0; i < 5; i++) {
    await screen.findByText(`Question ${i + 1}`);
    const juste = i % 2 === 0 ? '+ Plus' : '− Moins';
    const faux = i % 2 === 0 ? '− Moins' : '+ Plus';
    fireEvent.click(screen.getByRole('button', { name: bonnes ? juste : faux }));
    fireEvent.click(screen.getByRole('button', { name: i < 4 ? 'Chiffre suivant' : 'Voir mon score' }));
  }
}

describe('AmaiGame', () => {
  it('lit les chiffres du jour sur l’API d’Amai, dans la langue du lecteur', async () => {
    render(<AmaiGame locale="nl" />);
    await screen.findByText('Question 1');
    expect(appels[0].url).toBe('https://amai.governance.brussels/api/daily?lang=nl');
  });

  it('révèle la valeur réelle et le verdict après une réponse', async () => {
    render(<AmaiGame locale="fr" />);
    await screen.findByText('Question 1');
    fireEvent.click(screen.getByRole('button', { name: '+ Plus' }));
    expect(screen.getByText('✔ Bien vu')).toBeTruthy();
    expect(screen.getByText('Contexte 1')).toBeTruthy();
    // Écart de 50 % : le tampon « AMAI ! » apparaît.
    expect(screen.getByText(/AMAI/, { selector: 'span' })).toBeTruthy();
  });

  it('garde les sources de governance.brussels sur le site, dans la langue du lecteur', async () => {
    render(<AmaiGame locale="en" />);
    await screen.findByText('Question 1');
    fireEvent.click(screen.getByRole('button', { name: '+ Higher' }));
    const source = screen.getByRole('link', { name: 'Source' });
    expect(source.getAttribute('href')).toBe('/en/engagements');
    expect(source.getAttribute('target')).toBeNull();
  });

  it('envoie la partie au backend et affiche le score, la série et le percentile', async () => {
    render(<AmaiGame locale="fr" />);
    await jouerTout(true);

    expect(await screen.findByText(/5\/5/)).toBeTruthy();
    expect(await screen.findByText('Mieux que 72% des lecteurs aujourd\'hui.')).toBeTruthy();
    const envoi = appels.find((a) => a.url.endsWith('/api/plays'))!;
    expect(envoi.init?.method).toBe('POST');
    expect(JSON.parse(String(envoi.init?.body)).answers).toHaveLength(5);
    expect(localStorage.getItem('amai_streak')).toBe('1');
    expect(screen.getByRole('link', { name: /Baromètre/ }).getAttribute('href')).toBe('/fr/engagements');
  });

  it('signale un échec de copie au lieu de ne rien faire', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    render(<AmaiGame locale="fr" />);
    await jouerTout(false);
    fireEvent.click(await screen.findByRole('button', { name: 'Partager mon score' }));
    expect(screen.getByRole('button', { name: 'Copie impossible ici' })).toBeTruthy();
  });

  it('affiche une erreur et réessaie si l’API échoue', async () => {
    repondre({}, false);
    render(<AmaiGame locale="fr" />);
    expect(await screen.findByText(/Impossible de charger le jeu/)).toBeTruthy();
    repondre(PARTIE);
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText('Question 1')).toBeTruthy();
  });

  it('refuse une partie incomplète plutôt que de planter', async () => {
    repondre({ date: '2026-09-18', questions: [] });
    render(<AmaiGame locale="fr" />);
    expect(await screen.findByText(/Impossible de charger le jeu/)).toBeTruthy();
  });

  it("n'a aucune violation d'accessibilité, en cours de partie puis au score", async () => {
    const { container } = render(<AmaiGame locale="fr" />);
    await screen.findByText('Question 1');
    fireEvent.click(screen.getByRole('button', { name: '+ Plus' }));
    expect(await axe(container)).toHaveNoViolations();

    fireEvent.click(screen.getByRole('button', { name: 'Chiffre suivant' }));
    for (let i = 1; i < 5; i++) {
      await screen.findByText(`Question ${i + 1}`);
      fireEvent.click(screen.getByRole('button', { name: '+ Plus' }));
      fireEvent.click(screen.getByRole('button', { name: i < 4 ? 'Chiffre suivant' : 'Voir mon score' }));
    }
    await waitFor(() => expect(screen.getByRole('button', { name: 'Partager mon score' })).toBeTruthy());
    expect(await axe(container)).toHaveNoViolations();
  });
});
