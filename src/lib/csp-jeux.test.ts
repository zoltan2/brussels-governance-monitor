// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Garde-fou de la CSP des jeux quotidiens.
 *
 * Les jeux étaient encadrés jusqu'au 18/09/2026, et sont partis une première fois
 * en production bloqués par notre propre `frame-src` absent : un cadre bloqué ne se
 * plaint jamais, c'est une capture d'écran d'utilisateur qui l'a appris. Ils sont
 * désormais natifs et lisent l'API de chaque jeu ; le même piège existe sous une
 * autre directive. Une requête refusée par `connect-src` ne casse rien d'autre :
 * le jeu montre son écran d'erreur, la page répond 200, aucun test ne rougit.
 *
 * Ce test lit `next.config.ts` depuis le disque plutôt que d'importer la
 * configuration : celle-ci passe par le plugin next-intl et n'est pas évaluable
 * hors du contexte de build. Il vérifie la PRÉSENCE des origines, pas le
 * comportement du navigateur, qui ne se constate qu'en production.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AMAI_API } from './daily-game';
import { STUUT_API_JOUR } from './stuut';

const config = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf-8');

describe('CSP des jeux quotidiens', () => {
  it('autorise dans connect-src chaque API lue par les jeux natifs', () => {
    const directive = config.match(/"connect-src[^"]*"/)?.[0] ?? '';
    // Origines déduites des constantes, jamais recopiées : une URL d'API modifiée
    // sans mise à jour de la CSP fait échouer la CI.
    for (const url of [STUUT_API_JOUR, AMAI_API]) {
      const origine = new URL(url).origin;
      expect(directive, `API de jeu absente de connect-src : ${origine}`).toContain(origine);
    }
  });

  it("n'ouvre plus aucun cadre aux jeux : ils ne sont plus encadrés", () => {
    expect(config).not.toMatch(/"frame-src[^"]*governance\.brussels/);
  });

  it('ne confond pas ce que nous encadrons avec qui peut nous encadrer', () => {
    // frame-ancestors dit qui peut NOUS encadrer : il doit rester fermé.
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("{ key: 'X-Frame-Options', value: 'DENY' }");
  });
});
