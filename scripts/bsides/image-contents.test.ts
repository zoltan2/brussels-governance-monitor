// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe("empaquetage de l'image", () => {
  it("copie les migrations à l'emplacement que le runner lira", () => {
    const dockerfile = readFileSync(join(process.cwd(), 'Dockerfile'), 'utf8');
    // Source ET destination : un `COPY .../migrations ./mauvais-dossier`
    // passerait un test qui ne vérifie que la source, alors que le runner
    // (MIGRATIONS_DIR par défaut = process.cwd()/migrations) ne trouverait
    // rien à l'exécution.
    expect(dockerfile).toMatch(
      /COPY[^\n]*src\/lib\/bsides\/migrations\/\*\.sql\s+\.\/migrations\/?\b/,
    );
  });

  it('copie les trois scripts bundlés à la racine du runner', () => {
    const dockerfile = readFileSync(join(process.cwd(), 'Dockerfile'), 'utf8');
    for (const script of ['migrate.js', 'seed-admin.js', 'verify-admin.js']) {
      // Chaque script doit avoir SA PROPRE ligne COPY vers SA destination :
      // une seule assertion couvrant `migrate.js` laisserait disparaître
      // silencieusement `seed-admin.js` ou `verify-admin.js`, ce qui ferait
      // échouer la bascule au pire moment (vérification du compte, tâche 13).
      expect(dockerfile, `le COPY de ${script} manque ou ne cible pas ./${script}`).toMatch(
        new RegExp(`COPY[^\\n]*dist/${script}\\s+\\./${script}\\b`),
      );
    }
  });

  it('numérote les migrations sans trou ni doublon', () => {
    const versions = readdirSync(join(process.cwd(), 'src/lib/bsides/migrations'))
      .filter((f) => f.endsWith('.sql'))
      .map((f) => Number.parseInt(f.slice(0, 3), 10))
      .sort((a, b) => a - b);
    expect(versions).toEqual(versions.map((_, i) => i + 1));
  });
});
