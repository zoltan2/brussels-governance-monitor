// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}));

// Index Pagefind factice : l'import dynamique du composant vise ce chemin.
vi.mock('/pagefind/pagefind.js', () => ({
  init: () => {},
  search: async () => ({
    results: [
      {
        id: '1',
        data: async () => ({
          url: '/fr/domains/mobilite.html',
          meta: { title: 'Mobilité' },
          excerpt: 'a<img src=x onerror=alert(1)> <mark>mobilité</mark> &lt;script&gt;',
        }),
      },
    ],
  }),
}));

import { Search } from './search';

afterEach(cleanup);

describe('Search — dialogue modal', () => {
  it("s'affiche via un portail sur <body>, hors de l'entête", () => {
    // Reproduit la structure réelle : le <header> porte `backdrop-blur`, qui
    // crée un bloc conteneur pour les descendants `position: fixed`. Le
    // dialogue doit donc sortir du header par un portail, sinon `inset-0` se
    // cale sur le header et non sur la fenêtre (bug iOS Brave, 07/08/2026).
    const { container } = render(
      <header className="backdrop-blur-sm">
        <Search />
      </header>,
    );

    fireEvent.click(container.querySelector('button')!);

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(container.contains(dialog)).toBe(false);
    expect(dialog!.parentElement).toBe(document.body);
  });

  it("utilise un champ à 16 px pour éviter le zoom automatique iOS", () => {
    const { container } = render(<Search />);
    fireEvent.click(container.querySelector('button')!);

    const input = document.querySelector<HTMLInputElement>('#search-input')!;
    // iOS (WebKit, donc aussi Brave) zoome à la mise au point sur tout champ
    // dont la taille de police est < 16 px. `text-base` = 1rem = 16 px.
    expect(input.className).toContain('text-base');
    expect(input.className).not.toMatch(/(^|\s)text-sm(\s|$)/);
  });
});

describe('Search — extraits Pagefind', () => {
  it("rend l'extrait en texte : aucune balise injectée, <mark> conservé", async () => {
    // Revue red team du 28/09 : l'extrait était nettoyé par regex puis injecté
    // par dangerouslySetInnerHTML ; une balise non fermée passait.
    const { container } = render(<Search />);
    fireEvent.click(container.querySelector('button')!);
    const input = document.querySelector<HTMLInputElement>('#search-input')!;
    fireEvent.change(input, { target: { value: 'mobilite' } });

    const liste = await vi.waitFor(
      () => {
        const ul = document.querySelector('#search-results');
        if (!ul) throw new Error('pas encore de résultats');
        return ul;
      },
      { timeout: 3000 },
    );
    expect(liste.querySelector('img')).toBeNull();
    expect(liste.querySelector('script')).toBeNull();
    expect(liste.querySelector('mark')?.textContent).toBe('mobilité');
    expect(liste.textContent).toContain('<script>');
  });
});
