// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UmamiOwnerOptOut } from './umami-owner-opt-out';

/**
 * Né du 28/09/2026 : 14 des 23 clics « fait du jour » venaient d'appareils du
 * propriétaire. La clé `umami.disabled` est celle que lit le traceur servi
 * (voir `UMAMI_DISABLED_KEY`) ; on l'écrit ici en toutes lettres, pour que le
 * test rougisse si quelqu'un change la constante sans vérifier le traceur.
 */
beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('UmamiOwnerOptOut', () => {
  it("pose umami.disabled dans le localStorage et ne l'enlève pas au démontage", () => {
    expect(window.localStorage.getItem('umami.disabled')).toBeNull();
    const { unmount } = render(<UmamiOwnerOptOut />);
    expect(window.localStorage.getItem('umami.disabled')).toBe('1');
    unmount();
    expect(window.localStorage.getItem('umami.disabled')).toBe('1');
  });

  it("ne rend rien de visible", () => {
    const { container } = render(<UmamiOwnerOptOut />);
    expect(container.innerHTML).toBe('');
  });

  it('ne casse pas la page si le stockage lève (navigation privée, quota)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('bloqué', 'SecurityError');
    });
    expect(() => render(<UmamiOwnerOptOut />)).not.toThrow();
  });

  it('est monté par les layouts protégés /admin et /review', () => {
    for (const layout of ['admin', 'review']) {
      const s = readFileSync(join(process.cwd(), 'src/app/[locale]', layout, 'layout.tsx'), 'utf8');
      expect(s, layout).toMatch(/<UmamiOwnerOptOut\s*\/>/);
    }
  });
});
