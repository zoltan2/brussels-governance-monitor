// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Garde-fou de la directive `frame-src`.
 *
 * Même raison d'être que `analytics-events.test.ts` : un cadre bloqué ne se plaint
 * jamais. La page répond 200, le serveur ne journalise rien, aucun test ne casse,
 * et le navigateur se contente d'un cadre vide. Le 18/09/2026, les deux jeux
 * quotidiens sont partis en production bloqués, et c'est une capture d'écran
 * d'utilisateur qui l'a appris, pas la CI.
 *
 * Le piège est subtil et se reproduira : la CSP ne comportait AUCUNE directive
 * `frame-src`, et le chargement des cadres retombe alors sur `default-src 'self'`.
 * Or `'self'` est une correspondance exacte de schéma, hôte et port : un
 * sous-domaine du même projet n'en fait pas partie. Les jeux étaient donc bloqués
 * par nous, pas par eux.
 *
 * Ce test lit `next.config.ts` depuis le disque plutôt que d'importer la
 * configuration : celle-ci passe par le plugin next-intl et n'est pas évaluable
 * hors du contexte de build. Il vérifie la PRÉSENCE de la directive et des deux
 * origines, pas le comportement du navigateur, qui ne se constate qu'en production.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { STUUT_URL, AMAI_URLS } from './daily-game';

const config = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf-8');

/** Les origines réellement encadrées, déduites des constantes et non recopiées. */
function encadrees(): string[] {
  const urls = [STUUT_URL, ...Object.values(AMAI_URLS)];
  return [...new Set(urls.map((u) => new URL(u).origin))];
}

describe('CSP frame-src', () => {
  it('déclare une directive frame-src', () => {
    expect(
      config,
      "sans frame-src, les cadres retombent sur default-src 'self' et les jeux sont bloqués",
    ).toContain('frame-src');
  });

  it('autorise chaque origine réellement encadrée par le panneau de jeux', () => {
    const directive = config.match(/"frame-src[^"]*"/)?.[0] ?? '';
    for (const origine of encadrees()) {
      expect(directive, `origine encadrée absente de frame-src : ${origine}`).toContain(origine);
    }
  });

  it('ne confond pas frame-src avec frame-ancestors', () => {
    // frame-ancestors dit qui peut NOUS encadrer : il doit rester fermé.
    // Un futur correctif qui l'ouvrirait « pour réparer les jeux » se tromperait
    // de directive et nous exposerait au clickjacking.
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("{ key: 'X-Frame-Options', value: 'DENY' }");
  });
});
