// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Boutons flottants masqués sous 768 px jusqu'au premier geste (revue de l'accueil
 * du 28/09/2026, équipe Design, P3). Le masquage lui-même est une classe CSS : ici,
 * on vérifie QUAND elle tombe. Les mesures de recouvrement sont dans la PR.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HIDDEN_UNTIL_SCROLL, useRevealOnScroll } from './use-reveal-on-scroll';

function Flottant() {
  const revealed = useRevealOnScroll();
  return (
    <button type="button" className={`fixed ${revealed ? '' : HIDDEN_UNTIL_SCROLL}`}>
      x
    </button>
  );
}

/** Laisse passer l'image différée du premier contrôle. */
const uneImage = () => act(() => new Promise<void>((r) => requestAnimationFrame(() => r())));

function setScrollY(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
}

function setPageHeight(h: number) {
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: h, configurable: true });
}

beforeEach(() => {
  setScrollY(0);
  setPageHeight(9000); // bien plus haut que la fenêtre (768 px dans jsdom)
});
afterEach(cleanup);

const masque = (el: HTMLElement) => el.className.split(/\s+/).includes(HIDDEN_UNTIL_SCROLL);

describe('useRevealOnScroll', () => {
  it('ne masque que sous md : la classe est max-md:hidden, rien d’autre', () => {
    expect(HIDDEN_UNTIL_SCROLL).toBe('max-md:hidden');
  });

  it('masqué à l’ouverture, en haut d’une page qui défile', async () => {
    const { getByRole } = render(<Flottant />);
    await uneImage();
    expect(masque(getByRole('button'))).toBe(true);
  });

  it('apparaît au premier défilement et ne disparaît plus en remontant', async () => {
    const { getByRole } = render(<Flottant />);
    await uneImage();
    setScrollY(120);
    act(() => {
      fireEvent.scroll(window);
    });
    expect(masque(getByRole('button'))).toBe(false);
    setScrollY(0);
    act(() => {
      fireEvent.scroll(window);
    });
    expect(masque(getByRole('button'))).toBe(false);
  });

  it('apparaît à la première tabulation (clavier), pas sur une autre touche', async () => {
    const { getByRole } = render(<Flottant />);
    await uneImage();
    act(() => {
      fireEvent.keyDown(window, { key: 'a' });
    });
    expect(masque(getByRole('button'))).toBe(true);
    act(() => {
      fireEvent.keyDown(window, { key: 'Tab' });
    });
    expect(masque(getByRole('button'))).toBe(false);
  });

  it('visible d’emblée si la page ne défile pas (sinon jamais atteignable)', async () => {
    setPageHeight(500);
    const { getByRole } = render(<Flottant />);
    await uneImage();
    expect(masque(getByRole('button'))).toBe(false);
  });

  it('visible d’emblée si la page est déjà défilée (retour arrière)', async () => {
    setScrollY(1500);
    const { getByRole } = render(<Flottant />);
    await uneImage();
    expect(masque(getByRole('button'))).toBe(false);
  });
});
