// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { jourISO } from './velite-date';

describe('jourISO', () => {
  /**
   * La forme que `s.isodate()` rend RÉELLEMENT depuis `.velite/`. Le
   * frontmatter porte `"2026-09-13"` ; Velite le normalise en horodatage.
   */
  it("ramène l'horodatage de Velite au jour", () => {
    expect(jourISO('2026-09-13T00:00:00.000Z')).toBe('2026-09-13');
    expect(jourISO('2026-02-08T23:59:59.999Z')).toBe('2026-02-08');
  });

  it('laisse une date déjà au bon format inchangée', () => {
    expect(jourISO('2026-09-13')).toBe('2026-09-13');
  });

  it('rend undefined pour une valeur absente, jamais une date inventée', () => {
    expect(jourISO(undefined)).toBeUndefined();
  });

  /**
   * Une chaîne réellement illisible ressort TELLE QUELLE : c'est au
   * vérificateur en aval de rendre son verdict `unparsable`. Si on la
   * transformait ici, un frontmatter malformé deviendrait invisible.
   */
  it('laisse passer une valeur illisible sans la maquiller', () => {
    expect(jourISO('hier')).toBe('hier');
    expect(jourISO('13/09/2026')).toBe('13/09/2026');
    expect(jourISO('')).toBe('');
  });
});
