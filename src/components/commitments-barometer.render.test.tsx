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

// Le traducteur simulé restitue la clé ET ses valeurs : le nom accessible est
// désormais composé par le fichier de messages, et seul ce que le composant y
// transmet (le total, le résumé) relève encore de son contrat.
vi.mock('next-intl', () => ({
  useTranslations:
    () =>
    (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${Object.values(values).join(' ')}` : key,
  useLocale: () => 'fr',
}));

// Voir games-panel.render.test.tsx : createNavigation importe `next/navigation` en ESM,
// irrésolvable hors bundle Next.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}));

import { CommitmentsBarometer } from './commitments-barometer';

afterEach(cleanup);

function engagement(id: string, status: string): CommitmentLike {
  return { id, target: { fr: `Promesse ${id}` }, statusHistory: [{ status }] };
}

/** Répartition proche du réel : aucune promesse mise en œuvre, le reste dispersé. */
const REPARTITION: CommitmentLike[] = [
  ...Array.from({ length: 10 }, (_, i) => engagement(`leg${i}`, 'in-legislation')),
  ...Array.from({ length: 4 }, (_, i) => engagement(`ann${i}`, 'announced')),
  engagement('rien', 'not-started'),
  engagement('retard', 'delayed'),
];

describe('CommitmentsBarometer', () => {
  it('garde « mis en œuvre » dans la légende même à zéro', () => {
    // C'est le chiffre que le lecteur cherche en premier : le masquer parce qu'il vaut
    // zéro reviendrait à cacher le fait le plus important du baromètre.
    const { container } = render(<CommitmentsBarometer commitments={REPARTITION} />);
    expect(container.textContent).toContain('status.implemented');
  });

  it('ne dessine un segment que pour les statuts non nuls', () => {
    const { container } = render(<CommitmentsBarometer commitments={REPARTITION} />);
    const ruban = container.querySelector('[aria-hidden="true"]')!;
    // 4 statuts peuplés sur 6 : in-legislation, announced, not-started, delayed.
    expect(ruban.querySelectorAll('span').length).toBe(4);
  });

  it('donne à chaque segment une largeur proportionnelle à son compte', () => {
    const { container } = render(<CommitmentsBarometer commitments={REPARTITION} />);
    // `div[aria-hidden]` et non `[aria-hidden]` : la légende porte elle aussi
    // aria-hidden, et ses span seraient comptés comme des segments du ruban.
    const segments = [...container.querySelectorAll('div[aria-hidden="true"] span')] as HTMLElement[];
    // Une répartition, pas une note : la largeur EST le compte, sans pondération.
    expect(segments[0].style.flexGrow).toBe('10');
    expect(segments[1].style.flexGrow).toBe('4');
  });

  it('résume la répartition entière dans le nom accessible du lien', () => {
    // Le ruban et la légende sont aria-hidden : sans ce résumé, un lecteur d'écran
    // n'aurait aucun accès aux chiffres.
    const { container } = render(<CommitmentsBarometer commitments={REPARTITION} />);
    const label = container.querySelector('a')!.getAttribute('aria-label')!;
    expect(label).toContain('protoBarometerAria');
    expect(label).toContain('16');
    expect(label).toContain('status.implemented : 0');
    expect(label).toContain('status.in-legislation : 10');
  });

  it('retombe sur « pas encore abordé » quand le statut est inconnu', () => {
    const { container } = render(
      <CommitmentsBarometer commitments={[engagement('x', 'statut-inventé')]} />,
    );
    expect(container.querySelector('a')!.getAttribute('aria-label')).toContain(
      'status.not-started : 1',
    );
  });

  it('survit à une liste vide sans casser le rendu', () => {
    const { container } = render(<CommitmentsBarometer commitments={[]} />);
    expect(container.querySelector('a')).not.toBeNull();
    // Aucun segment dans le ruban, mais la légende garde sa ligne « mis en œuvre » à
    // zéro : c'est voulu, et c'est pourquoi le sélecteur vise le ruban seul.
    expect(container.querySelectorAll('div[aria-hidden="true"] span').length).toBe(0);
  });

  it("n'a aucune violation d'accessibilité", async () => {
    const { container } = render(<CommitmentsBarometer commitments={REPARTITION} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
