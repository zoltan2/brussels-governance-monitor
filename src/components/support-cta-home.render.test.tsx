// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

// Le traducteur simulé restitue la clé ET ses valeurs, pour voir le nombre passé.
vi.mock('next-intl', () => ({
  useTranslations:
    () =>
    (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${Object.values(values).join(' ')}` : key,
  useFormatter: () => ({ number: (n: number) => String(n) }),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SupportCtaChangelog, SupportCtaHome } from './support-cta';

afterEach(cleanup);

/**
 * Valeurs arbitraires, choisies pour ne ressembler à aucun chiffre réel ni
 * aux anciens 528 / 323 / 4 écrits en dur : si le composant réécrivait un
 * nombre en dur, il ne pourrait pas tomber sur ceux-ci.
 */
const STATS = { pages: 7351, sourcesSuivies: 6173, langues: 9 };

describe('SupportCtaHome', () => {
  it('affiche les chiffres reçus, et aucun nombre écrit en dur', () => {
    const { container } = render(<SupportCtaHome stats={STATS} />);
    const nombres = [...container.querySelectorAll('strong')].map((s) => s.textContent);
    expect(nombres).toEqual(['7351', '6173', '9']);
    expect(container.textContent).not.toMatch(/\b(528|323)\b/);
  });
});

describe('SupportCtaChangelog', () => {
  it('passe le nombre de sources suivies au message', () => {
    const { container } = render(<SupportCtaChangelog sourcesSuivies={6173} />);
    expect(container.textContent).toContain('changelogLine 6173');
  });
});
