// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { DossierFaq, type FaqEntry } from './dossier-faq';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

const FAQ: FaqEntry[] = [
  {
    q: 'Qui gère les crèches à Bruxelles ?',
    a: 'Trois autorités : l’**ONE**, Opgroeien et Iriscare. Voir [le dossier](https://governance.brussels/fr/dossiers/petite-enfance).',
    sources: [{ label: 'ONE', url: 'https://www.one.be/', accessedAt: '2026-06-17' }],
  },
];

afterEach(() => cleanup());

describe('DossierFaq', () => {
  it('renders the title, questions, answers and source links', () => {
    const { container, getByText } = render(<DossierFaq faq={FAQ} title="Questions fréquentes" />);
    expect(getByText('Questions fréquentes').tagName).toBe('H2');
    const summary = container.querySelector('details[open] > summary');
    expect(summary?.textContent).toContain('Qui gère les crèches');
    expect(container.querySelector('strong')?.textContent).toBe('ONE');
    expect(container.querySelector('a[href="https://www.one.be/"]')?.textContent).toBe('ONE');
  });

  it('emits a valid FAQPage JSON-LD with plain-text answers', () => {
    const { container } = render(<DossierFaq faq={FAQ} title="Questions fréquentes" />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
    const data = JSON.parse(script!.textContent!);
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity).toHaveLength(1);
    expect(data.mainEntity[0]['@type']).toBe('Question');
    expect(data.mainEntity[0].name).toBe('Qui gère les crèches à Bruxelles ?');
    expect(data.mainEntity[0].acceptedAnswer.text).toBe(
      'Trois autorités : l’ONE, Opgroeien et Iriscare. Voir le dossier.',
    );
  });

  it('renders nothing when faq is empty', () => {
    const { container } = render(<DossierFaq faq={[]} title="Questions fréquentes" />);
    expect(container.innerHTML).toBe('');
  });

  it('has no axe violations', async () => {
    const { container } = render(<DossierFaq faq={FAQ} title="Questions fréquentes" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
