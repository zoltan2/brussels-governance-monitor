// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { WhatChangedBanner } from './what-changed-banner';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

const LABELS = {
  updated: 'Mis à jour',
  readMore: 'Lire ce qui a changé',
  readLess: 'Réduire',
  viewHistory: "Voir l'historique",
  types: { 'status-change': 'Changement de statut', updated: 'Mis à jour' },
};
const NOW = new Date('2026-06-27T10:00:00Z');

afterEach(() => cleanup());

describe('WhatChangedBanner', () => {
  it('renders nothing when changeSummaryDate is missing', () => {
    const { container } = render(
      <WhatChangedBanner changeSummary="Quelque chose a changé." labels={LABELS} now={NOW} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the change is older than the window', () => {
    const { container } = render(
      <WhatChangedBanner changeSummary="Vieux." changeSummaryDate="2026-05-18" labels={LABELS} now={NOW} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when changeSummary is empty/whitespace', () => {
    const { container } = render(
      <WhatChangedBanner changeSummary="   " changeSummaryDate="2026-06-25" labels={LABELS} now={NOW} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a SHORT summary as a plain <p> with no dead affordance', () => {
    const { getByText, container } = render(
      <WhatChangedBanner changeSummary="Le dimanche sans voiture est fixé au 20 septembre." changeSummaryDate="2026-06-25" labels={LABELS} now={NOW} />,
    );
    expect(getByText('Mis à jour')).toBeTruthy(); // pill
    expect(getByText(/20 septembre/)).toBeTruthy();
    expect(container.querySelector('details')).toBeNull();
    expect(container.querySelector('.wc-more')).toBeNull();
  });

  it('wraps a LONG summary in <details> with clamp + affordance', () => {
    const long =
      "Deux conflits sociaux s'ouvrent à Bruxelles, au CPAS de Molenbeek et dans neuf des douze entreprises de travail adapté.";
    const { container } = render(
      <WhatChangedBanner changeSummary={long} changeSummaryDate="2026-06-25" labels={LABELS} now={NOW} />,
    );
    expect(container.querySelector('details')).toBeTruthy();
    expect(container.querySelector('.wc-clamp')?.textContent).toContain('Molenbeek');
    expect(container.querySelector('.wc-more')?.textContent).toContain('Lire ce qui a changé');
  });

  it('uses the localized changeType label when provided', () => {
    const { getByText } = render(
      <WhatChangedBanner changeSummary="Statut modifié." changeSummaryDate="2026-06-25" changeType="status-change" labels={LABELS} now={NOW} />,
    );
    expect(getByText('Changement de statut')).toBeTruthy();
  });

  it('has no accessibility violations (long, with details)', async () => {
    const long =
      "Deux conflits sociaux s'ouvrent à Bruxelles, au CPAS de Molenbeek et dans neuf des douze entreprises de travail adapté.";
    const { container } = render(
      <WhatChangedBanner changeSummary={long} changeSummaryDate="2026-06-25" labels={LABELS} now={NOW} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders no history link when historyHref is not provided', () => {
    const { container } = render(
      <WhatChangedBanner changeSummary="Court." changeSummaryDate="2026-06-25" labels={LABELS} now={NOW} />,
    );
    expect(container.querySelector('a')).toBeNull();
  });

  it('renders a history link with the given href when historyHref is provided', () => {
    const { container, getByText } = render(
      <WhatChangedBanner
        changeSummary="Court."
        changeSummaryDate="2026-06-25"
        historyHref="/fr/changelog?slug=security&section=domains"
        labels={LABELS}
        now={NOW}
      />,
    );
    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('/fr/changelog?slug=security&section=domains');
    expect(getByText(/Voir l'historique/)).toBeTruthy();
  });

  it('renders no history link when the whole banner is gated out (old date), even with historyHref set', () => {
    const { container } = render(
      <WhatChangedBanner
        changeSummary="Vieux."
        changeSummaryDate="2026-05-18"
        historyHref="/fr/changelog?slug=security&section=domains"
        labels={LABELS}
        now={NOW}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
