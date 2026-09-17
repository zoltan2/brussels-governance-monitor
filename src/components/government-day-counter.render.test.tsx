// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { GovernmentDayCounter } from './government-day-counter';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

afterEach(cleanup);

/** Date ISO d'il y a `n` jours, calculée ici sans réutiliser l'arithmétique du
 *  composant : un test qui recopie la formule qu'il contrôle hérite de ses angles
 *  morts et passerait même si elle était fausse. */
function ilYA(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

describe('GovernmentDayCounter', () => {
  it('compte zéro jour le jour même de la prestation de serment', () => {
    const { container } = render(
      <GovernmentDayCounter oathDate={ilYA(0)} oathLabel="14 février 2026" />,
    );
    expect(container.textContent).toContain('0');
  });

  it('compte les jours écoulés depuis une date passée', () => {
    const { container } = render(
      <GovernmentDayCounter oathDate={ilYA(10)} oathLabel="14 février 2026" />,
    );
    expect(container.textContent).toContain('10');
  });

  it('ne descend jamais sous zéro pour une date future', () => {
    const futur = new Date();
    futur.setUTCDate(futur.getUTCDate() + 30);
    const { container } = render(
      <GovernmentDayCounter oathDate={futur.toISOString().slice(0, 10)} oathLabel="demain" />,
    );
    // Un compteur négatif serait absurde à l'écran ; daysSince borne à 0.
    expect(container.textContent).not.toMatch(/-\d/);
    expect(container.textContent).toContain('0');
  });

  it("rappelle la date de prestation de serment telle qu'elle est fournie", () => {
    const { container } = render(
      <GovernmentDayCounter oathDate={ilYA(5)} oathLabel="14 février 2026" />,
    );
    expect(container.textContent).toContain('14 février 2026');
  });

  it("n'a aucune violation d'accessibilité", async () => {
    const { container } = render(
      <GovernmentDayCounter oathDate={ilYA(215)} oathLabel="14 février 2026" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
