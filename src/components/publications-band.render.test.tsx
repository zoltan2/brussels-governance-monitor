// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PublicationsBandView } from './publications-band';

const LABELS = {
  eyebrow: 'Publications',
  title: 'Le digest hebdomadaire, en {count} langues',
  subscribe: "S'abonner",
  magazineCta: 'Le magazine : Bruxelles relue et vérifiée',
};

const BASE = {
  locale: 'fr',
  langs: ['fr', 'nl', 'en', 'de', 'ar', 'tr'],
  latestCompleteWeek: '2026-w26',
  magazine: {
    tagline: 'Trois ans de blocage dénoués en une soirée, un permis de métro relancé.',
    href: 'https://magazine.governance.brussels/s26/',
  },
  subscribeHref: '#subscribe',
  labels: LABELS,
};

afterEach(() => cleanup());

describe('PublicationsBandView', () => {
  it('renders nothing when there is no complete week', () => {
    const { container } = render(<PublicationsBandView {...BASE} latestCompleteWeek={null} langs={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the language count in the title', () => {
    const { getByText } = render(<PublicationsBandView {...BASE} />);
    expect(getByText('Le digest hebdomadaire, en 6 langues')).toBeTruthy();
  });

  it('renders the 4 core langs as links to /digest/{lang}/{year}/{week}', () => {
    const { container } = render(<PublicationsBandView {...BASE} />);
    for (const lang of ['fr', 'nl', 'en', 'de']) {
      const a = container.querySelector(`a[href="/digest/${lang}/2026/w26"]`);
      expect(a, `core ${lang} should be a link`).toBeTruthy();
      expect(a?.getAttribute('lang')).toBe(lang);
    }
  });

  it('renders extra langs as proof (NOT links), still with a lang attribute', () => {
    const { container } = render(<PublicationsBandView {...BASE} />);
    // no digest link for an extra lang
    expect(container.querySelector('a[href*="/digest/ar/"]')).toBeNull();
    expect(container.querySelector('a[href*="/digest/tr/"]')).toBeNull();
    // but a lang-tagged element exists for it
    expect(container.querySelector('[lang="ar"]')).toBeTruthy();
    expect(container.querySelector('[lang="tr"]')).toBeTruthy();
  });

  it('renders the subscribe CTA + magazine real tagline + slogan link (no em-dash)', () => {
    const { getByText, container } = render(<PublicationsBandView {...BASE} />);
    expect(getByText("S'abonner")).toBeTruthy();
    // real tagline of the week is shown
    expect(getByText(/Trois ans de blocage/)).toBeTruthy();
    // slogan link to the magazine
    const mag = container.querySelector('a[href="https://magazine.governance.brussels/s26/"]');
    expect(mag).toBeTruthy();
    expect(mag?.textContent).toContain('Bruxelles relue et vérifiée');
    expect(container.textContent).not.toContain('—'); // no em-dash in new content
  });

  it('hides the magazine sub-block when no magazine data', () => {
    const { container } = render(<PublicationsBandView {...BASE} magazine={null} />);
    expect(container.querySelector('a[href*="magazine.governance.brussels"]')).toBeNull();
  });
});
