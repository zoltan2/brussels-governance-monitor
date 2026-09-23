// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import type { ReactNode } from 'react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Le Link localisé préfixe la langue ; ici, seul compte l'attribut qu'il reçoit.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SupportBanner } from './support-cta';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

afterEach(cleanup);

describe('SupportBanner', () => {
  it('affiche le même bandeau, avec les textes du pied de page, vers /support', () => {
    const { container } = render(<SupportBanner position="dossier-haut" />);
    const text = container.textContent ?? '';
    expect(text).toContain('supportTitle');
    expect(text).toContain('supportSubtitle');
    expect(text).toContain('supportCta');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/support');
  });

  it("mesure le clic et dit d'où il vient", () => {
    for (const position of ['pied-de-page', 'dossier-haut', 'domaine-haut', 'secteur-haut'] as const) {
      const { container } = render(<SupportBanner position={position} />);
      const a = container.querySelector('a')!;
      expect(a.getAttribute('data-umami-event')).toBe('soutien-clic');
      expect(a.getAttribute('data-umami-event-position')).toBe(position);
      cleanup();
    }
  });

  it("ne se masque à l'impression que si on le demande", () => {
    const top = render(<SupportBanner position="dossier-haut" hideOnPrint />);
    expect(top.container.firstElementChild?.hasAttribute('data-hide-print')).toBe(true);
    cleanup();
    const foot = render(<SupportBanner position="pied-de-page" />);
    expect(foot.container.firstElementChild?.hasAttribute('data-hide-print')).toBe(false);
  });

  it('ne présente aucune violation axe', async () => {
    const { container } = render(<SupportBanner position="dossier-haut" className="mb-6" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
