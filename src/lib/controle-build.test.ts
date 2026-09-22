// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import {
  comparer,
  formaterRapport,
  MANQUANTS_CITES_MAX,
  pagesAttendues,
  pagesProduites,
  type CollectionsVelite,
  type ManifestePrerendu,
  type RouteAttendue,
} from './controle-build';

const LOCALES = ['de', 'en', 'fr', 'nl'] as const;
const jour = (d: string) => d.slice(0, 10);

function collections(partiel: Partial<CollectionsVelite> = {}): CollectionsVelite {
  return {
    domainCards: [],
    sectorCards: [],
    solutionCards: [],
    comparisonCards: [],
    communeCards: [],
    archivePages: [],
    dossierCards: [],
    verifications: [],
    digestEntries: [],
    ...partiel,
  };
}

const opts = { locales: LOCALES, scrollyAutorises: new Set(['cpas']), jour };

function route(r: string, attendus: RouteAttendue[]): RouteAttendue {
  const trouvee = attendus.find((a) => a.route === r);
  if (!trouvee) throw new Error(`route absente : ${r}`);
  return trouvee;
}

/** Produit tout ce qui est attendu : le cas nominal. */
function toutProduit(attendus: RouteAttendue[]): Map<string, Set<string>> {
  return new Map(attendus.map((r) => [r.route, new Set(r.pages.map((p) => p.chemin))]));
}

describe('pagesAttendues', () => {
  it('multiplie les slugs uniques par les quatre locales pour les routes simples', () => {
    const c = collections({
      domainCards: [
        { slug: 'budget', locale: 'fr' },
        { slug: 'budget', locale: 'nl' },
        { slug: 'mobility', locale: 'fr' },
      ],
    });
    const domaines = route('/[locale]/domains/[slug]', pagesAttendues(c, opts));
    expect(domaines.pages).toHaveLength(8);
    expect(domaines.pages).toContainEqual({ locale: 'de', chemin: '/de/domains/mobility' });
  });

  it('prend le slug localisé de la carte FR pour les dossiers, et ignore un dossier sans FR', () => {
    const c = collections({
      dossierCards: [
        { slug: 'cpas', locale: 'fr', localizedSlugs: { nl: 'ocmw' } },
        { slug: 'orphelin', locale: 'nl' },
      ],
    });
    const chemins = route('/[locale]/dossiers/[slug]', pagesAttendues(c, opts)).pages.map((p) => p.chemin);
    expect(chemins.sort()).toEqual(['/de/dossiers/cpas', '/en/dossiers/cpas', '/fr/dossiers/cpas', '/nl/dossiers/ocmw']);
  });

  it('ne promet la vue immersive que dans les locales natives', () => {
    const c = collections({ dossierCards: [{ slug: 'cpas', locale: 'fr' }, { slug: 'autre', locale: 'fr' }] });
    const scrolly = route('/[locale]/dossiers/[slug]/scrolly', pagesAttendues(c, opts));
    expect(scrolly.pages).toEqual([{ locale: 'fr', chemin: '/fr/dossiers/cpas/scrolly' }]);
    expect(scrolly.localesMinimales).toEqual(['fr']);
  });

  it('coupe l’horodatage des vérifications et fait le produit semaines × langues du digest', () => {
    const c = collections({
      verifications: [{ cardSlug: 'budget', date: '2026-02-08T00:00:00.000Z', locale: 'fr' }],
      digestEntries: [
        { week: '2026-w07', lang: 'fr' },
        { week: '2026-w08', lang: 'ar' },
      ],
    });
    const a = pagesAttendues(c, opts);
    expect(route('/[locale]/verifications/[slug]', a).pages).toEqual([
      { locale: 'fr', chemin: '/fr/verifications/budget-2026-02-08' },
    ]);
    expect(route('/digest/[lang]/[year]/[week]', a).pages.map((p) => p.chemin).sort()).toEqual([
      '/digest/ar/2026/w07',
      '/digest/ar/2026/w08',
      '/digest/fr/2026/w07',
      '/digest/fr/2026/w08',
    ]);
  });
});

describe('pagesProduites', () => {
  it('regroupe par srcRoute et écarte HTML absent, 404 pré-rendues et routes sans source', () => {
    const m: ManifestePrerendu = {
      routes: {
        '/fr/domains/budget': { srcRoute: '/[locale]/domains/[slug]' },
        '/fr/domains/perdu': { srcRoute: '/[locale]/domains/[slug]' },
        '/fr/domains/introuvable': { srcRoute: '/[locale]/domains/[slug]' },
        '/sitemap.xml': { srcRoute: null },
      },
      notFoundRoutes: ['/fr/domains/introuvable'],
    };
    const p = pagesProduites(m, (ch) => ch !== '/fr/domains/perdu');
    expect([...p.keys()]).toEqual(['/[locale]/domains/[slug]']);
    expect([...(p.get('/[locale]/domains/[slug]') ?? [])]).toEqual(['/fr/domains/budget']);
  });
});

describe('comparer', () => {
  const contenu = collections({
    domainCards: [{ slug: 'budget', locale: 'fr' }],
    sectorCards: [{ slug: 'taxis', locale: 'fr' }],
    solutionCards: [{ slug: 's', locale: 'fr' }],
    comparisonCards: [{ slug: 'c', locale: 'fr' }],
    communeCards: [{ slug: 'ixelles', locale: 'fr' }],
    archivePages: [{ slug: 'a', locale: 'fr' }],
    dossierCards: [{ slug: 'cpas', locale: 'fr' }],
    verifications: LOCALES.map((locale) => ({ cardSlug: 'budget', date: '2026-02-08', locale })),
    digestEntries: ['fr', 'nl', 'en', 'de'].map((lang) => ({ week: '2026-w07', lang })),
  });

  it('passe quand tout ce qui est attendu est produit', () => {
    const attendus = pagesAttendues(contenu, opts);
    const r = comparer(attendus, toutProduit(attendus));
    expect(r.ok).toBe(true);
    expect(r.enTrop).toEqual([]);
    expect(r.lignes.every((l) => l.attendu === l.produit)).toBe(true);
  });

  it('échoue et nomme la route, la locale et les pages quand des pages manquent', () => {
    const attendus = pagesAttendues(contenu, opts);
    const produites = toutProduit(attendus);
    produites.get('/[locale]/dossiers/[slug]')?.delete('/nl/dossiers/cpas');
    const r = comparer(attendus, produites);
    expect(r.ok).toBe(false);
    const fautives = r.lignes.filter((l) => l.manquants.length > 0);
    expect(fautives).toEqual([
      {
        route: '/[locale]/dossiers/[slug]',
        locale: 'nl',
        attendu: 1,
        produit: 0,
        manquants: ['/nl/dossiers/cpas'],
        sousBorneBasse: true,
      },
    ]);
  });

  it('échoue quand une route entière est absente du manifeste', () => {
    const attendus = pagesAttendues(contenu, opts);
    const produites = toutProduit(attendus);
    produites.delete('/[locale]/sectors/[slug]');
    const r = comparer(attendus, produites);
    expect(r.ok).toBe(false);
    expect(r.lignes.filter((l) => l.route === '/[locale]/sectors/[slug]').map((l) => l.produit)).toEqual([0, 0, 0, 0]);
  });

  it('borne basse : échoue quand attendu ET produit sont vides', () => {
    const attendus = pagesAttendues(collections(), opts);
    const r = comparer(attendus, new Map());
    expect(r.ok).toBe(false);
    const domaines = r.lignes.filter((l) => l.route === '/[locale]/domains/[slug]');
    expect(domaines.map((l) => l.locale)).toEqual(['de', 'en', 'fr', 'nl']);
    expect(domaines.every((l) => l.attendu === 0 && l.produit === 0 && l.sousBorneBasse)).toBe(true);
  });

  it('borne basse : une locale exigée sans aucun contenu échoue, même si rien ne manque', () => {
    const sansDe = { ...contenu, verifications: contenu.verifications.filter((v) => v.locale !== 'de') };
    const attendus = pagesAttendues(sansDe, opts);
    const r = comparer(attendus, toutProduit(attendus));
    expect(r.ok).toBe(false);
    expect(r.lignes.filter((l) => l.sousBorneBasse).map((l) => `${l.route} ${l.locale}`)).toEqual([
      '/[locale]/verifications/[slug] de',
    ]);
  });

  it('signale sans échouer une page produite hors attendu', () => {
    const attendus = pagesAttendues(contenu, opts);
    const produites = toutProduit(attendus);
    produites.get('/[locale]/domains/[slug]')?.add('/fr/domains/imprevu');
    const r = comparer(attendus, produites);
    expect(r.ok).toBe(true);
    expect(r.enTrop).toEqual([{ route: '/[locale]/domains/[slug]', chemin: '/fr/domains/imprevu' }]);
  });
});

describe('formaterRapport', () => {
  it(`cite au plus ${MANQUANTS_CITES_MAX} pages manquantes et compte le reste`, () => {
    const slugs = Array.from({ length: 15 }, (_, i) => ({ slug: `d${String(i).padStart(2, '0')}`, locale: 'fr' }));
    const attendus = pagesAttendues(collections({ domainCards: slugs }), opts);
    const r = comparer(attendus, new Map());
    const texte = formaterRapport(r);
    const blocFr = texte.slice(texte.indexOf('ÉCHEC /[locale]/domains/[slug] [fr] attendu 15, produit 0'));
    expect(blocFr[0]).toBe('ÉCHEC /[locale]/domains/[slug] [fr] attendu 15, produit 0');
    expect(blocFr.filter((l) => l.startsWith('        /fr/domains/'))).toHaveLength(MANQUANTS_CITES_MAX);
    expect(blocFr).toContain('        … et 5 autre(s)');
  });
});
