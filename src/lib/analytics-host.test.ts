// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Garde-fou né du 08/09/2026.
 *
 * Le tracking a basculé d'Umami Cloud vers l'auto-hébergé le 20/06/2026, et
 * « le Cloud ne reçoit plus rien ». Mais seul le layout `[locale]` a été
 * migré : `/livre`, `/digest` et `/merci-cafe-numerique` ont continué de
 * charger `cloud.umami.is`. Résultat, **ces trois pages n'ont plus été
 * mesurées du tout** à partir du 31/05, sans le moindre signal — pendant que
 * deux précommandes arrivaient bel et bien par `/livre` en août et septembre.
 *
 * Une page non mesurée ne se plaint pas. Ce test est le seul signal possible.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'src');

function sourceFiles(): string[] {
  return globSync('**/*.{ts,tsx}', { cwd: SRC })
    .filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))
    .map((f) => join(SRC, f));
}

describe('hôte des analytics', () => {
  it('ne charge plus jamais le script depuis Umami Cloud, qui ne reçoit rien', () => {
    const coupables = sourceFiles().filter((f) =>
      readFileSync(f, 'utf8').includes('cloud.umami.is/script.js'),
    );

    expect(coupables.map((f) => f.replace(SRC, 'src'))).toEqual([]);
  });

  it('déclare data-host-url partout où le script est chargé', () => {
    // Sans `data-host-url`, le script poste ses événements à l'origine par
    // défaut et non au proxy `/u` : le compteur se tait sans erreur visible.
    const manquants = sourceFiles().filter((f) => {
      const s = readFileSync(f, 'utf8');
      return s.includes('/u/script.js') && !s.includes('data-host-url');
    });

    expect(manquants.map((f) => f.replace(SRC, 'src'))).toEqual([]);
  });
});
