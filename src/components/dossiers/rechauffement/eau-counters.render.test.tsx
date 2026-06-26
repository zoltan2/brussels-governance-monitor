// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { RechauffementEauCounters } from './eau-counters';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);
afterEach(() => cleanup());

describe('RechauffementEauCounters', () => {
  it('rend une <figure> avec aria-labelledby resolu', () => {
    const { container } = render(<RechauffementEauCounters />);
    const fig = container.querySelector('figure');
    expect(fig).toBeTruthy();
    const id = fig?.getAttribute('aria-labelledby');
    expect(id).toBeTruthy();
    expect(container.querySelector(`#${id}`)).toBeTruthy();
  });

  it('anti-chiffre nu : 150 accompagne de "captages"', () => {
    const { container } = render(<RechauffementEauCounters />);
    const text = container.textContent ?? '';
    expect(text).toMatch(/150/);
    expect(text).toMatch(/captages/i);
  });

  it('anti-chiffre nu : 53 accompagne de "%" et "impermeab"', () => {
    const { container } = render(<RechauffementEauCounters />);
    const text = container.textContent ?? '';
    const idx = text.indexOf('53');
    expect(idx).toBeGreaterThan(-1);
    expect(text.slice(idx, idx + 6)).toMatch(/53\s*%/);
    expect(text).toMatch(/imperm/i);
  });

  it('mentionne Vivaqua avec une unite km', () => {
    const { container } = render(<RechauffementEauCounters />);
    const text = container.textContent ?? '';
    expect(text).toMatch(/Vivaqua/i);
    expect(text).toMatch(/km/);
  });

  it('contient le compteur risque d\'inondation', () => {
    const { container } = render(<RechauffementEauCounters />);
    expect(container.textContent ?? '').toMatch(/inondation/i);
  });

  it('ne reprend PAS la tuile piscine (evite le doublon avec les compteurs chaleur)', () => {
    const { container } = render(<RechauffementEauCounters />);
    expect(container.textContent ?? '').not.toMatch(/piscine/i);
  });

  it("n'utilise aucune classe Tailwind dark:", () => {
    const { container } = render(<RechauffementEauCounters />);
    container.querySelectorAll('[class]').forEach((el) => {
      expect(el.getAttribute('class') ?? '').not.toMatch(/\bdark:/);
    });
  });

  it('a pas de violations axe', async () => {
    const { container } = render(<RechauffementEauCounters />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('locale="nl" affiche les traductions neerlandaises', () => {
    const { container } = render(<RechauffementEauCounters locale="nl" />);
    expect(container.textContent ?? '').toMatch(/bronnen|Vivaqua/i);
  });
});
