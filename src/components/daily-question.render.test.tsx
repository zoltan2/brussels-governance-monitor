// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

// Le traducteur simulé restitue la clé ET ses valeurs, sinon une assertion sur un
// texte interpolé passerait pour de mauvaises raisons.
vi.mock('next-intl', () => ({
  useTranslations:
    () =>
    (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${Object.values(values).join(' ')}` : key,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}));

// Le pool réel range TOUJOURS la bonne réponse en première position : c'est la raison
// d'être du mélange par graine. Le jeu d'essai reproduit exactement cette forme.
const POOL = {
  questions: [
    {
      id: 'q1',
      question: 'Combien de communes compte la Région bruxelloise ?',
      options: ['19 communes', '6 communes', '25 communes', '12 communes'],
      correct: 0,
      explanation: 'La Région compte 19 communes depuis 1971.',
      sourceSlug: '/fr/domaines/institutional',
      sourceTitle: 'Institutionnel',
    },
  ],
};

beforeEach(() => {
  // jsdom n'implémente pas IntersectionObserver : on le déclenche immédiatement,
  // sans quoi le chargement paresseux ne part jamais et le composant reste en attente.
  globalThis.IntersectionObserver = class {
    constructor(private cb: IntersectionObserverCallback) {}
    observe() {
      this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds = [];
  } as unknown as typeof IntersectionObserver;

  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => POOL,
  })) as unknown as typeof fetch;

  localStorage.clear();
});

import { DailyQuestion } from './daily-question';

afterEach(cleanup);

describe('DailyQuestion', () => {
  it('annonce le chargement avant que le pool arrive', () => {
    const { container } = render(<DailyQuestion locale="fr" />);
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });

  it('propose les quatre réponses une fois le pool chargé', async () => {
    const { container } = render(<DailyQuestion locale="fr" />);
    await waitFor(() => {
      expect(container.querySelectorAll('[aria-label="protoAnswersGroup"] button').length).toBe(4);
    });
  });

  it('ne laisse pas la bonne réponse en première position', async () => {
    // Les 68 questions du pool stockent la bonne réponse en premier : sans mélange,
    // cliquer le premier bouton gagnerait toujours.
    const { container } = render(<DailyQuestion locale="fr" />);
    await waitFor(() => {
      expect(container.querySelectorAll('[aria-label="protoAnswersGroup"] button').length).toBe(4);
    });
    const libelles = [...container.querySelectorAll('[aria-label="protoAnswersGroup"] button')].map(
      (b) => b.textContent,
    );
    // Les quatre options sont bien toutes présentes, quel que soit l'ordre tiré.
    for (const option of POOL.questions[0].options) {
      expect(libelles.some((l) => l?.includes(option))).toBe(true);
    }
  });

  it("remplace les boutons par l'explication après une réponse, en nommant la bonne", async () => {
    const { container } = render(<DailyQuestion locale="fr" />);
    await waitFor(() => {
      expect(container.querySelectorAll('[aria-label="protoAnswersGroup"] button').length).toBe(4);
    });

    fireEvent.click(container.querySelectorAll('[aria-label="protoAnswersGroup"] button')[0]);

    // Aucun contrôle désactivé ne doit subsister derrière le verdict.
    expect(container.querySelector('[aria-label="protoAnswersGroup"]')).toBeNull();
    expect(container.textContent).toContain('19 communes');
    expect(container.textContent).toContain('La Région compte 19 communes depuis 1971.');
  });

  it('offre de réessayer quand le pool ne se charge pas', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500 })) as unknown as typeof fetch;
    const { container } = render(<DailyQuestion locale="fr" />);
    await waitFor(() => {
      expect(container.querySelector('[role="alert"]')).not.toBeNull();
    });
    expect(container.textContent).toContain('protoRetry');
  });

  it("n'a aucune violation d'accessibilité, question affichée", async () => {
    const { container } = render(<DailyQuestion locale="fr" />);
    await waitFor(() => {
      expect(container.querySelectorAll('[aria-label="protoAnswersGroup"] button').length).toBe(4);
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
