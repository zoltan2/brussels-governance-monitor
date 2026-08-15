// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe("empaquetage de l'image", () => {
  it('copie chaque fichier de migration du dépôt', () => {
    const dockerfile = readFileSync(join(process.cwd(), 'Dockerfile'), 'utf8');
    expect(dockerfile).toMatch(/COPY .*src\/lib\/bsides\/migrations/);
  });

  it('copie le runner bundlé', () => {
    const dockerfile = readFileSync(join(process.cwd(), 'Dockerfile'), 'utf8');
    expect(dockerfile).toMatch(/COPY .*migrate\.js/);
  });

  it('numérote les migrations sans trou ni doublon', () => {
    const versions = readdirSync(join(process.cwd(), 'src/lib/bsides/migrations'))
      .filter((f) => f.endsWith('.sql'))
      .map((f) => Number.parseInt(f.slice(0, 3), 10))
      .sort((a, b) => a - b);
    expect(versions).toEqual(versions.map((_, i) => i + 1));
  });
});
