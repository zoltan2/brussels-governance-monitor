// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { digestDejaEnvoye } from './digest-prepare-guard';

describe('digestDejaEnvoye', () => {
  it('protège un digest de la même semaine déjà envoyé ou programmé', () => {
    expect(digestDejaEnvoye({ week: '2026-w42', sent: true }, '2026-w42')).toBe(true);
  });

  it('laisse préparer une semaine nouvelle, même si la précédente est partie', () => {
    expect(digestDejaEnvoye({ week: '2026-w41', sent: true }, '2026-w42')).toBe(false);
  });

  it('laisse repréparer la même semaine tant qu’elle n’est pas envoyée', () => {
    expect(digestDejaEnvoye({ week: '2026-w42', sent: false }, '2026-w42')).toBe(false);
    expect(digestDejaEnvoye({ week: '2026-w42' }, '2026-w42')).toBe(false);
  });

  it('laisse préparer quand aucun fichier n’existe', () => {
    expect(digestDejaEnvoye(null, '2026-w42')).toBe(false);
  });
});
