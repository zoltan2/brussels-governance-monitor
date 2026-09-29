// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { compterErreurs } from '../ops/velite-sans-erreur.mjs';

describe('velite-sans-erreur', () => {
  it("compte les lignes « error » (incident mobility du 29/09/2026), pas les notes « info »", () => {
    const sortie = [
      'content/domain-cards/mobility.fr.mdx',
      " error Invalid enum value. Expected 'new' | 'updated', received 'corrected'  changeType",
      'content/digest/2026-w39.fr.mdx',
      ' info  String must contain at most 60 character(s)   magazine.items.[0].stat_label',
      '143 messages (✖ 1 error)',
    ].join('\n');
    expect(compterErreurs(sortie)).toBe(1);
  });

  it('lit une sortie colorée', () => {
    expect(compterErreurs('\x1b[31m error \x1b[39mInvalid enum value')).toBe(1);
  });

  it('aucune erreur : zéro', () => {
    expect(compterErreurs(' info  The content is empty\n[VELITE] build finished')).toBe(0);
  });
});
