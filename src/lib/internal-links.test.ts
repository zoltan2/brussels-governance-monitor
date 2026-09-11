// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { findLinkProblems, findRouteMismatches, validSegmentsByLocale } from './internal-links';

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
  // Deux routes réelles qui partagent leur segment en français et en néerlandais.
  '/explainers': { fr: '/comprendre', nl: '/begrijpen', en: '/explainers', de: '/erklaerungen' },
  '/understand': { fr: '/comprendre', nl: '/begrijpen', en: '/understand', de: '/verstehen' },
};

describe('validSegmentsByLocale', () => {
  it('prend le premier segment localisé de chaque route, par langue', () => {
    const v = validSegmentsByLocale(PATHNAMES, LOCALES);
    expect([...v.de!].sort()).toEqual(['bereiche', 'dossiers', 'erklaerungen', 'gemeinden', 'sektoren', 'verstehen']);
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

  it('ne propose aucune correction pour un segment ambigu', () => {
    // comprendre = explainers ET understand : pour /en/, les deux sont possibles.
    const r = findRouteMismatches('[a](/en/comprendre) [b](/de/begrijpen/x)', PATHNAMES, LOCALES);
    expect(r.map((m) => m.suggestion)).toEqual([null, null]);
  });

  it('accepte un segment partagé quand il est valide pour la langue du lien', () => {
    expect(findRouteMismatches('[a](/fr/comprendre) [b](/nl/begrijpen)', PATHNAMES, LOCALES)).toEqual([]);
  });
});

describe('findLinkProblems (chemin complet)', () => {
  const ROUTES = {
    pathnames: {
      ...PATHNAMES,
      '/explainers/levels-of-power': {
        fr: '/comprendre/niveaux-de-pouvoir',
        nl: '/begrijpen/machtsniveaus',
        en: '/explainers/levels-of-power',
        de: '/erklaerungen/machtebenen',
      },
      '/communes/[slug]': { fr: '/communes/[slug]', nl: '/gemeenten/[slug]', en: '/municipalities/[slug]', de: '/gemeinden/[slug]' },
    },
    locales: LOCALES,
    unlocalized: ['/subscribe', '/dossiers/[slug]/scrolly'],
    slugs: {
      '/dossiers/[slug]': { fr: new Set(['lez', 'metro-3']), nl: new Set(['lez']) },
      '/domains/[slug]': { fr: new Set(['budget', 'security']), nl: new Set(['budget']), en: new Set(['budget']), de: new Set(['budget']) },
      '/communes/[slug]': { fr: new Set(['saint-gilles']), nl: new Set(['saint-gilles']), en: new Set(['saint-gilles']), de: new Set(['saint-gilles']) },
    },
    rootEntries: new Set(['digest', 'feed', 'logo.png', 'static']),
  };
  const kinds = (content: string, locale?: string) =>
    findLinkProblems(content, ROUTES, locale).map((p) => [p.link, p.kind, p.suggestion]);

  it("attrape le sous-chemin d'une autre langue sous un premier segment valide", () => {
    // Le premier segment `comprendre` est valide en français : l'ancien contrôle laissait passer.
    expect(kinds('[a](/fr/comprendre/machtsniveaus)')).toEqual([
      ['/fr/comprendre/machtsniveaus', 'wrong-locale-path', '/fr/comprendre/niveaux-de-pouvoir'],
    ]);
  });

  it("signale une fiche qui n'existe pas, sans deviner de correction", () => {
    // Le cas relevé le 2026-09-11 : /xx/dossiers/numerique n'a jamais existé.
    expect(kinds('[a](/fr/dossiers/numerique) [b](/nl/dossiers/metro-3)')).toEqual([
      ['/fr/dossiers/numerique', 'unknown-slug', null],
      ['/nl/dossiers/metro-3', 'unknown-slug', null],
    ]);
  });

  it("corrige un lien sans langue vers la langue de la fiche, avec le chemin de cette langue", () => {
    expect(kinds('[a](/communes/saint-gilles#x)', 'nl')).toEqual([
      ['/communes/saint-gilles#x', 'no-locale', '/nl/gemeenten/saint-gilles#x'],
    ]);
    expect(kinds('[a](/domaines/security)', 'fr')).toEqual([['/domaines/security', 'no-locale', '/fr/domaines/security']]);
  });

  it("refuse un préfixe de langue que le site n'a pas", () => {
    expect(kinds('[a](/es/dossiers/lez)', 'fr')).toEqual([['/es/dossiers/lez', 'foreign-prefix', '/fr/dossiers/lez']]);
  });

  it('laisse passer les routes hors langue, les fichiers publics et les routes non localisées', () => {
    const ok = '[a](/digest/fr/2026/w36) [b](/logo.png) [c](/fr/subscribe) [d](/nl/dossiers/lez/scrolly) [e](/fr) [f](//cdn.example.com/x) [g](/)';
    expect(kinds(ok, 'fr')).toEqual([]);
  });

  it('laisse passer un lien juste avec ancre ou requête', () => {
    expect(kinds('[a](/de/bereiche/budget#zahlen) [b](/fr/domaines/budget?x=1)')).toEqual([]);
  });

  it('ne vérifie pas le slug des routes sans collection connue', () => {
    expect(kinds('[a](/fr/secteurs/inconnu)')).toEqual([]);
  });
});
