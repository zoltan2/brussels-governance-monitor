// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { findRouteMismatches, validSegmentsByLocale } from './internal-links';

const LOCALES = ['de', 'en', 'fr', 'nl'] as const;

// Extrait figé de src/i18n/routing.ts le 2026-09-11 : les trois familles de
// routes où des liens fautifs ont été trouvés, plus une route identique
// dans toutes les langues.
const PATHNAMES = {
  '/': '/',
  '/domains/[slug]': { fr: '/domaines/[slug]', nl: '/domeinen/[slug]', en: '/domains/[slug]', de: '/bereiche/[slug]' },
  '/sectors/[slug]': { fr: '/secteurs/[slug]', nl: '/sectoren/[slug]', en: '/sectors/[slug]', de: '/sektoren/[slug]' },
  '/communes': { fr: '/communes', nl: '/gemeenten', en: '/municipalities', de: '/gemeinden' },
  '/dossiers/[slug]': '/dossiers/[slug]',
};

describe('validSegmentsByLocale', () => {
  it('prend le premier segment localisé de chaque route, par langue', () => {
    const v = validSegmentsByLocale(PATHNAMES, LOCALES);
    expect([...v.de!].sort()).toEqual(['bereiche', 'dossiers', 'gemeinden', 'sektoren']);
    expect(v.fr!.has('domaines')).toBe(true);
    expect(v.fr!.has('domains')).toBe(false);
  });
});

describe('findRouteMismatches', () => {
  it("signale le segment d'une autre langue et propose le bon", () => {
    const content = 'Voir [la fiche](/nl/bereiche/climate) et [ici](/de/domains/social#chiffres).';
    const r = findRouteMismatches(content, PATHNAMES, LOCALES);
    expect(r.map((m) => [m.link, m.suggestion])).toEqual([
      ['/nl/bereiche/climate', '/nl/domeinen/climate'],
      ['/de/domains/social#chiffres', '/de/bereiche/social#chiffres'],
    ]);
  });

  it('attrape un lien sans barre finale, vers une page de liste', () => {
    const r = findRouteMismatches('[Gemeenten](/nl/communes)', PATHNAMES, LOCALES);
    expect(r).toHaveLength(1);
    expect(r[0]!.suggestion).toBe('/nl/gemeenten');
  });

  it("signale un segment inventé, sans suggestion possible", () => {
    // Le cas du 2026-09-11 : /de/domaenen/ renvoyait une 404.
    const r = findRouteMismatches('[Mobilität](/de/domaenen/mobility)', PATHNAMES, LOCALES);
    expect(r).toHaveLength(1);
    expect(r[0]!.suggestion).toBeNull();
  });

  it('laisse passer les liens corrects, y compris une route identique partout', () => {
    const content = [
      '[a](/fr/domaines/budget) [b](/nl/domeinen/budget) [c](/en/domains/budget)',
      '[d](/de/bereiche/budget) [e](/de/dossiers/lez) [f](/fr) [g](https://example.com/de/domains/x)',
    ].join('\n');
    expect(findRouteMismatches(content, PATHNAMES, LOCALES)).toEqual([]);
  });

  it('donne le numéro de ligne de chaque lien fautif', () => {
    const r = findRouteMismatches('ligne un\n\n[x](/fr/sectors/horeca)', PATHNAMES, LOCALES);
    expect(r[0]!.line).toBe(3);
    expect(r[0]!.suggestion).toBe('/fr/secteurs/horeca');
  });
});
