// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const trackMock = vi.fn();
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { WhatsappInvite } from './whatsapp-invite';

afterEach(() => {
  cleanup();
  trackMock.mockClear();
});

describe('WhatsappInvite', () => {
  it.each(['fr', 'nl', 'en'])('affiche un lien sortant vers la chaîne en %s', (locale) => {
    const { getByRole } = render(<WhatsappInvite locale={locale} />);
    const lien = getByRole('link');
    expect(lien.getAttribute('href')).toMatch(/^https:\/\/whatsapp\.com\/channel\//);
    expect(lien.getAttribute('target')).toBe('_blank');
    expect(lien.getAttribute('rel')).toBe('noopener noreferrer');
    // Le nom accessible dit où mène le lien et qu'il ouvre un nouvel onglet.
    expect(lien.textContent).toContain('WhatsApp');
    expect(lien.querySelector('.sr-only')?.textContent?.length).toBeGreaterThan(5);
  });

  it('ne rend rien en allemand', () => {
    const { container } = render(<WhatsappInvite locale="de" />);
    expect(container.innerHTML).toBe('');
  });

  it('mesure le clic sans bloquer la navigation', () => {
    const { getByRole } = render(<WhatsappInvite locale="fr" />);
    const lien = getByRole('link');
    expect(lien.getAttribute('data-suivi')).toBe('accueil-whatsapp');
    fireEvent.click(lien);
    expect(trackMock).toHaveBeenCalledWith('accueil-whatsapp', undefined);
  });
});
