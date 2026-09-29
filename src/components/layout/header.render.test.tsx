// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactNode } from 'react';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
  useLocale: () => 'fr',
}));

vi.mock('next/image', () => ({
  default: (props: { alt: string }) => <span data-alt={props.alt} />,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={String(href)} {...rest}>{children}</a>
  ),
}));

vi.mock('@/lib/analytics', () => ({ track: () => {} }));

vi.mock('./locale-switcher', () => ({ LocaleSwitcher: () => null }));

vi.mock('/pagefind/pagefind.js', () => ({
  init: () => {},
  search: async () => ({ results: [] }),
}));

import { Header } from './header';

afterEach(cleanup);

describe('Header — recherche visible sous lg', () => {
  it('affiche une loupe dans la barre, hors du menu, avec un nom accessible traduit', () => {
    render(<Header />);

    // Menu fermé : la loupe doit être dans la barre elle-même.
    const loupe = screen.getByRole('button', { name: 'search.open' });

    // Sous lg : dans le groupe `lg:hidden`, pas dans la nav large `hidden lg:flex`.
    expect(loupe.closest('.lg\\:hidden')).not.toBeNull();
    expect(loupe.closest('nav[aria-label="Main"]')).toBeNull();

    // À côté du bouton menu, et avant lui dans l'ordre de tabulation.
    const menu = screen.getByRole('button', { name: 'Menu' });
    expect(loupe.parentElement).toBe(menu.parentElement);
    expect(loupe.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Cible tactile de 44 × 44 px (h-11 w-11), aucun masquage du contrôle.
    expect(loupe.className).toMatch(/(^|\s)h-11(\s|$)/);
    expect(loupe.className).toMatch(/(^|\s)w-11(\s|$)/);
    expect(loupe.closest('[aria-hidden="true"]')).toBeNull();
    expect(loupe.tabIndex).not.toBe(-1);
  });

  it('ouvre la recherche au clic, et rend le focus à la loupe à la fermeture', () => {
    render(<Header />);
    const loupe = screen.getByRole('button', { name: 'search.open' });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    fireEvent.click(loupe);

    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('#search-input')).not.toBeNull();
    expect(document.activeElement).toBe(dialog.querySelector('#search-input'));

    fireEvent.click(screen.getByRole('button', { name: 'search.close' }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(loupe);
  });

  it("Ctrl+K n'ouvre qu'un seul dialogue, même avec la loupe mobile montée", () => {
    render(<Header />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  });
});
