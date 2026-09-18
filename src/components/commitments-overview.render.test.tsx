// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import type { CommitmentLike } from '@/lib/commitment-status';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}));

import { CommitmentsOverview } from './commitments-overview';

afterEach(cleanup);

type Deadline = CommitmentLike & { deadline: string };

function engagement(id: string, status: string, deadline: string): Deadline {
  return { id, target: { fr: `Promesse ${id}` }, statusHistory: [{ status }], deadline };
}

const LOT: Deadline[] = [
  engagement('a', 'in-legislation', '2026'),
  engagement('b', 'in-legislation', '2026'),
  engagement('c', 'announced', '2027'),
  engagement('d', 'delayed', '2027'),
  engagement('e', 'not-started', '2029'),
];

describe('CommitmentsOverview', () => {
  it('met le verdict en toutes lettres dans le titre, au pluriel juste', () => {
    const { container } = render(<CommitmentsOverview commitments={LOT} />);
    expect(container.querySelector('h2')!.textContent).toBe(
      'Aucune des 5 promesses chiffrées n’est mise en œuvre à ce jour',
    );
  });

  it('accorde le verdict au singulier quand une seule promesse est tenue', () => {
    const lot = [...LOT, engagement('f', 'implemented', '2026')];
    const { container } = render(<CommitmentsOverview commitments={lot} />);
    expect(container.querySelector('h2')!.textContent).toContain('1 promesse chiffrée sur 6');
  });

  it('donne un nom accessible chiffré à chaque ruban, ceux-ci étant des images', () => {
    // Les rubans sont role="img" : sans aria-label, la répartition serait muette.
    const { container } = render(<CommitmentsOverview commitments={LOT} />);
    const rubans = [...container.querySelectorAll('[role="img"]')];
    expect(rubans.length).toBe(1 + 3); // global + une échéance par année
    expect(rubans[0].getAttribute('aria-label')).toContain('Répartition des 5 engagements');
  });

  it('trie les échéances chronologiquement, une ligne par année', () => {
    const { container } = render(<CommitmentsOverview commitments={LOT} />);
    const annees = [...container.querySelectorAll('li span:first-child')]
      .map((s) => s.textContent!.trim())
      .filter((t) => /^\d{4}$/.test(t));
    expect(annees).toEqual(['2026', '2027', '2029']);
  });

  it('accorde le nombre de promesses par échéance', () => {
    const { container } = render(<CommitmentsOverview commitments={LOT} />);
    expect(container.textContent).toContain('2 promesses');
    expect(container.textContent).toContain('1 promesse');
  });

  it('garde « mis en œuvre » dans la légende à zéro, et son pourcentage', () => {
    const { container } = render(<CommitmentsOverview commitments={LOT} />);
    expect(container.textContent).toContain('status.implemented');
    expect(container.textContent).toContain('0 %');
  });

  it('ne déduit aucun retard d’une échéance : seul le statut delayed le dit', () => {
    // Une promesse 2026 « en cours législatif » n'est pas en retard tant que l'année court.
    const { container } = render(
      <CommitmentsOverview commitments={[engagement('a', 'in-legislation', '2026')]} />,
    );
    expect(container.textContent).not.toContain('status.delayed');
  });

  it("n'a aucune violation d'accessibilité", async () => {
    const { container } = render(<CommitmentsOverview commitments={LOT} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
