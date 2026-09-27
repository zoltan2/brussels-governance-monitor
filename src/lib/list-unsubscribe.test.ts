// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listUnsubscribeHeaders } from './list-unsubscribe';

describe('listUnsubscribeHeaders', () => {
  it('vise la route qui désabonne, pas la page de préférences', () => {
    const h = listUnsubscribeHeaders('https://governance.brussels', 'a.b+c', 'nl');
    expect(h['List-Unsubscribe']).toBe(
      '<https://governance.brussels/api/unsubscribe/one-click?token=a.b%2Bc&locale=nl>',
    );
    expect(h['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  // Garde : aucun envoi ne doit reconstruire l'en-tête à la main vers une page.
  it.each([
    'src/app/api/digest/approve-from-review/route.ts',
    'src/app/api/cron/digest/route.ts',
    'src/app/api/digest/test-send/route.ts',
  ])('%s passe par listUnsubscribeHeaders', (fichier) => {
    const source = readFileSync(join(process.cwd(), fichier), 'utf8');
    expect(source).toContain('listUnsubscribeHeaders(');
    expect(source).not.toMatch(/'List-Unsubscribe':/);
  });
});
