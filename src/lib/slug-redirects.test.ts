// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PAGE_TYPES,
  PAGE_TYPE_NAMES,
  checkSlugRedirects,
  countByType,
  parseScrollyAllowlist,
  parseSlugPathnames,
  routesByType,
  servedUrls,
  type ContentEntry,
  type PageType,
  type Redirect,
  type RetiredUrl,
  type RouteTemplates,
  type SlugRedirectInput,
  type SlugSnapshot,
} from './slug-redirects';
import { SLUG_REDIRECTS_301, URLS_RETIREES, getRedirectsConfig } from './redirects-301';
import { routing } from '@/i18n/routing';

const LOCALES = ['de', 'en', 'fr', 'nl'] as const;
const NONE: ReadonlySet<string> = new Set();
const ROOT = path.resolve(__dirname, '..', '..');
const ROUTING_SRC = fs.readFileSync(path.join(ROOT, 'src/i18n/routing.ts'), 'utf8');
/** Gabarits RÉELS de routing.ts : les tests exercent les vrais segments localisés. */
const ROUTES = routesByType(parseSlugPathnames(ROUTING_SRC, LOCALES)!);
/** Index des types, cibles admises (le script les lit dans routing.ts + src/app). */
const STATIC = [
  ...LOCALES.map((l) => `/${l}/dossiers`),
  '/fr/domaines',
  '/nl/domeinen',
  '/fr/communes',
  '/fr/secteurs',
  '/fr/chronologie',
];

/** Un dossier traduit dans les quatre langues, slugs localisés par langue. */
function dossier(
  slug: string,
  localizedSlugs?: Partial<Record<string, string>>,
  opts: { file?: string; langs?: readonly string[] } = {},
): ContentEntry[] {
  const base = opts.file ?? slug;
  return (opts.langs ?? LOCALES).map((locale) => ({
    file: `content/dossiers/${base}.${locale}.mdx`,
    locale,
    slug,
    localizedSlugs,
  }));
}

/** Une fiche d'un type à repli FR (domaine, commune…), dans les langues voulues. */
function card(
  type: PageType,
  slug: string,
  opts: { file?: string; langs?: readonly string[]; draft?: boolean } = {},
): ContentEntry[] {
  const base = opts.file ?? slug;
  return (opts.langs ?? LOCALES).map((locale) => ({
    file: `${PAGE_TYPES[type].dir}/${base}.${locale}.mdx`,
    locale,
    slug,
    draft: opts.draft,
  }));
}

/** Une vérification : l'URL dérive de cardSlug et date, pas du champ slug. */
function verif(cardSlug: string, date: string, langs: readonly string[] = LOCALES, slug = `${cardSlug}-${date}`): ContentEntry[] {
  return langs.map((locale) => ({
    file: `content/verifications/${cardSlug}-${date}.${locale}.mdx`,
    locale,
    slug,
    cardSlug,
    date,
  }));
}

function snap(
  entries: Partial<Record<PageType, ContentEntry[]>>,
  opts: { routes?: Partial<Record<PageType, RouteTemplates>>; scrolly?: ReadonlySet<string> } = {},
): SlugSnapshot {
  return { entries, routes: opts.routes ?? ROUTES, scrollyAllowlist: opts.scrolly ?? NONE };
}

type Extra = Partial<Omit<SlugRedirectInput, 'before' | 'after'>> & { redirects?: Redirect[]; retired?: RetiredUrl[] };

function runSnap(before: SlugSnapshot, after: SlugSnapshot, extra: Extra = {}) {
  return checkSlugRedirects({
    locales: LOCALES,
    before,
    after,
    renames: extra.renames,
    redirects: extra.redirects ?? [],
    retired: extra.retired ?? [],
    staticPages: extra.staticPages ?? STATIC,
  });
}

/** Raccourci historique : dossiers seulement. */
function run(
  before: ContentEntry[],
  after: ContentEntry[],
  extra: Extra & { scrollyBefore?: ReadonlySet<string>; scrollyAfter?: ReadonlySet<string> } = {},
) {
  return runSnap(
    snap({ dossiers: before }, { scrolly: extra.scrollyBefore }),
    snap({ dossiers: after }, { scrolly: extra.scrollyAfter }),
    extra,
  );
}

/** Un type à repli FR seulement. */
const runT = (type: PageType, before: ContentEntry[], after: ContentEntry[], extra: Extra = {}) =>
  runSnap(snap({ [type]: before }), snap({ [type]: after }), extra);

const kinds = (v: ReturnType<typeof run>) => v.map((x) => x.kind);
const byFrom = (a: Redirect | undefined, b: Redirect | undefined) => a!.from.localeCompare(b!.from);

describe('servedUrls : dossiers', () => {
  it('sert une URL par langue, slug localisé de la carte FR sinon canonique', () => {
    const urls = servedUrls(snap({ dossiers: dossier('cpas-bruxellois', { nl: 'ocmw-brussel' }) }), LOCALES).served.map(
      (s) => s.url,
    );
    expect(urls.sort()).toEqual(
      [
        '/de/dossiers/cpas-bruxellois',
        '/en/dossiers/cpas-bruxellois',
        '/fr/dossiers/cpas-bruxellois',
        '/nl/dossiers/ocmw-brussel',
      ].sort(),
    );
  });

  it("n'émet la vue immersive que pour les langues natives d'un dossier autorisé", () => {
    const urls = servedUrls(
      snap({ dossiers: dossier('acs', undefined, { langs: ['fr', 'nl'] }) }, { scrolly: new Set(['acs']) }),
      LOCALES,
    ).served.map((s) => s.url);
    expect(urls).toContain('/fr/dossiers/acs/scrolly');
    expect(urls).toContain('/nl/dossiers/acs/scrolly');
    expect(urls).not.toContain('/de/dossiers/acs/scrolly');
    expect(urls).toContain('/de/dossiers/acs'); // repli FR de la page
  });
});

describe('servedUrls : autres types', () => {
  it('segments localisés de routing.ts, par langue', () => {
    const urls = servedUrls(snap({ domains: card('domains', 'mobility'), communes: card('communes', 'ixelles') }), LOCALES)
      .served.map((s) => s.url)
      .sort();
    expect(urls).toEqual(
      [
        '/de/bereiche/mobility',
        '/en/domains/mobility',
        '/fr/domaines/mobility',
        '/nl/domeinen/mobility',
        '/de/gemeinden/ixelles',
        '/en/municipalities/ixelles',
        '/fr/communes/ixelles',
        '/nl/gemeenten/ixelles',
      ].sort(),
    );
  });

  it('traduction manquante : la page reste servie en repli FR dans les quatre langues', () => {
    const r = servedUrls(snap({ sectors: card('sectors', 'horeca', { langs: ['fr'] }) }), LOCALES);
    expect(r.served).toHaveLength(4);
    expect(r.unrenderable).toEqual([]);
  });

  it('slug sans carte FR : généré dans les quatre langues, servi seulement là où il a une carte', () => {
    const r = servedUrls(snap({ solutions: card('solutions', 'x', { langs: ['nl'] }) }), LOCALES);
    expect(r.served.map((s) => s.url)).toEqual(['/nl/oplossingen/x']);
    expect(r.unrenderable.map((s) => s.url).sort()).toEqual(['/de/loesungen/x', '/en/solutions/x', '/fr/solutions/x']);
  });

  it('brouillon : servi comme les autres (aucune route ne filtre draft)', () => {
    const r = servedUrls(snap({ comparisons: card('comparisons', 'x', { draft: true }) }), LOCALES);
    expect(r.served).toHaveLength(4);
  });

  it('vérification : une URL par fiche, dans sa seule langue, identifiant cardSlug-date', () => {
    const r = servedUrls(snap({ verifications: verif('budget', '2026-02-08', ['fr', 'nl'], 'autre-chose') }), LOCALES);
    expect(r.served.map((s) => s.url).sort()).toEqual([
      '/fr/verifications/budget-2026-02-08',
      '/nl/verificaties/budget-2026-02-08',
    ]);
  });

  it('vérification : un horodatage complet est ramené au jour (idDeVerification)', () => {
    const r = servedUrls(snap({ verifications: verif('budget', '2026-02-08T00:00:00.000Z', ['fr']) }), LOCALES);
    expect(r.served.map((s) => s.url)).toEqual(['/fr/verifications/budget-2026-02-08']);
  });

  it('countByType compte chaque type, zéro compris', () => {
    const c = countByType(servedUrls(snap({ archives: card('archives', 'a') }), LOCALES).served);
    expect(c.archives).toBe(4);
    expect(c.dossiers).toBe(0);
    expect(Object.keys(c).sort()).toEqual([...PAGE_TYPE_NAMES].sort());
  });
});

describe('checkSlugRedirects : dossiers, URL perdues', () => {
  it('aucun changement : conforme', () => {
    expect(run(dossier('acs'), dossier('acs'))).toEqual([]);
  });

  it('nouveau dossier : aucune URL perdue, conforme', () => {
    expect(run(dossier('acs'), [...dossier('acs'), ...dossier('lez')])).toEqual([]);
  });

  it('slug localisé ajouté sans redirection : échec avec l’entrée exacte', () => {
    const v = run(dossier('cpas-bruxellois'), dossier('cpas-bruxellois', { nl: 'ocmw-brussel' }));
    expect(kinds(v)).toEqual(['missing-redirect']);
    expect(v[0]!.fix).toEqual({ from: '/nl/dossiers/cpas-bruxellois', to: '/nl/dossiers/ocmw-brussel' });
    expect(v[0]!.message).toContain("{ from: '/nl/dossiers/cpas-bruxellois', to: '/nl/dossiers/ocmw-brussel' },");
  });

  it('slug localisé ajouté avec sa redirection : conforme', () => {
    expect(
      run(dossier('cpas-bruxellois'), dossier('cpas-bruxellois', { nl: 'ocmw-brussel' }), {
        redirects: [{ from: '/nl/dossiers/cpas-bruxellois', to: '/nl/dossiers/ocmw-brussel' }],
      }),
    ).toEqual([]);
  });

  it('slug localisé renommé : exige ancien localisé → nouveau localisé', () => {
    const v = run(
      dossier('cpas-bruxellois', { nl: 'ocmw-brussel' }),
      dossier('cpas-bruxellois', { nl: 'ocmw-brussels' }),
    );
    expect(v.map((x) => x.fix)).toEqual([{ from: '/nl/dossiers/ocmw-brussel', to: '/nl/dossiers/ocmw-brussels' }]);
  });

  it('renommage après une première migration : la table doit être réécrite à plat', () => {
    // A → B existait ; B → C ajouté sans réécrire A : chaîne interdite.
    const v = run(
      dossier('cpas-bruxellois', { nl: 'ocmw-brussel' }),
      dossier('cpas-bruxellois', { nl: 'ocmw-brussels' }),
      {
        redirects: [
          { from: '/nl/dossiers/cpas-bruxellois', to: '/nl/dossiers/ocmw-brussel' },
          { from: '/nl/dossiers/ocmw-brussel', to: '/nl/dossiers/ocmw-brussels' },
        ],
      },
    );
    expect(kinds(v)).toEqual(['chain']);
    expect(v[0]!.fix).toEqual({ from: '/nl/dossiers/cpas-bruxellois', to: '/nl/dossiers/ocmw-brussels' });
  });

  it('slug localisé retiré : la page revient au slug canonique, redirection exigée', () => {
    const v = run(dossier('cpas-bruxellois', { nl: 'ocmw-brussel' }), dossier('cpas-bruxellois'));
    expect(v.map((x) => x.fix)).toEqual([{ from: '/nl/dossiers/ocmw-brussel', to: '/nl/dossiers/cpas-bruxellois' }]);
  });

  it('redirection vers la mauvaise cible : échec, entrée corrigée proposée', () => {
    const v = run(dossier('cpas-bruxellois'), dossier('cpas-bruxellois', { nl: 'ocmw-brussel' }), {
      redirects: [{ from: '/nl/dossiers/cpas-bruxellois', to: '/nl/dossiers' }],
    });
    expect(kinds(v)).toEqual(['wrong-target']);
    expect(v[0]!.fix!.to).toBe('/nl/dossiers/ocmw-brussel');
  });

  it('slug canonique changé dans le même fichier : une redirection par langue', () => {
    const v = run(dossier('acs', undefined, { file: 'acs' }), dossier('acs-bruxelles', undefined, { file: 'acs' }));
    expect(v.map((x) => x.fix).sort(byFrom)).toEqual(
      LOCALES.map((l) => ({ from: `/${l}/dossiers/acs`, to: `/${l}/dossiers/acs-bruxelles` })),
    );
  });

  it('fichier renommé (détection git) : la cible suit le slug localisé de la nouvelle fiche', () => {
    const renames = new Map(LOCALES.map((l) => [`content/dossiers/acs.${l}.mdx`, `content/dossiers/acs-bruxelles.${l}.mdx`]));
    const v = run(dossier('acs'), dossier('acs-bruxelles', { nl: 'acs-brussel' }), { renames });
    expect(v.find((x) => x.fix?.from === '/nl/dossiers/acs')!.fix!.to).toBe('/nl/dossiers/acs-brussel');
    expect(kinds(v).every((k) => k === 'missing-redirect')).toBe(true);
    expect(v).toHaveLength(4);
  });

  it('fichier renommé sans détection de renommage : traité comme une suppression, décision exigée', () => {
    const v = run(dossier('acs'), dossier('acs-bruxelles'));
    expect(kinds(v)).toEqual(Array(4).fill('deleted-without-decision'));
  });

  it('dossier supprimé sans décision : échec qui propose redirection ou retrait', () => {
    const v = run([...dossier('acs'), ...dossier('lez')], dossier('lez'));
    expect(kinds(v)).toEqual(Array(4).fill('deleted-without-decision'));
    expect(v[0]!.message).toContain('URLS_RETIREES');
    expect(v[0]!.message).toContain('SLUG_REDIRECTS_301');
  });

  it('dossier supprimé avec redirection vers une page servie ou avec retrait explicite : conforme', () => {
    const v = run([...dossier('acs'), ...dossier('lez')], dossier('lez'), {
      redirects: [
        { from: '/fr/dossiers/acs', to: '/fr/dossiers/lez' },
        { from: '/nl/dossiers/acs', to: '/nl/dossiers' },
      ],
      retired: [
        { path: '/de/dossiers/acs', raison: 'Dossier clos, pas de successeur.' },
        { path: '/en/dossiers/acs', raison: 'Dossier clos, pas de successeur.' },
      ],
    });
    expect(v).toEqual([]);
  });

  it('suppression de la seule traduction : la page reste servie en repli FR, rien à faire', () => {
    const before = dossier('acs');
    const after = before.filter((d) => d.locale !== 'de');
    expect(run(before, after)).toEqual([]);
  });

  it('vue immersive : le slug localisé change aussi son URL /scrolly', () => {
    const allow = new Set(['cpas-bruxellois']);
    const v = run(dossier('cpas-bruxellois'), dossier('cpas-bruxellois', { nl: 'ocmw-brussel' }), {
      scrollyBefore: allow,
      scrollyAfter: allow,
      redirects: [{ from: '/nl/dossiers/cpas-bruxellois', to: '/nl/dossiers/ocmw-brussel' }],
    });
    expect(v.map((x) => x.fix)).toEqual([
      { from: '/nl/dossiers/cpas-bruxellois/scrolly', to: '/nl/dossiers/ocmw-brussel/scrolly' },
    ]);
  });

  it('vue immersive retirée de la liste : redirection vers la page du dossier', () => {
    const v = run(dossier('acs', undefined, { langs: ['fr'] }), dossier('acs', undefined, { langs: ['fr'] }), {
      scrollyBefore: new Set(['acs']),
    });
    expect(v.map((x) => x.fix)).toEqual([{ from: '/fr/dossiers/acs/scrolly', to: '/fr/dossiers/acs' }]);
  });

  it('slug localisé déclaré sur la seule carte FR : la page répondrait 404, échec', () => {
    const after = dossier('cpas-bruxellois').map((d) =>
      d.locale === 'fr' ? { ...d, localizedSlugs: { nl: 'ocmw-brussel' } } : d,
    );
    const v = run(dossier('cpas-bruxellois'), after, {
      redirects: [{ from: '/nl/dossiers/cpas-bruxellois', to: '/nl/dossiers/ocmw-brussel' }],
    });
    expect(kinds(v)).toContain('unrenderable-page');
  });
});

// Les six types à repli FR partagent le même modèle : chaque cas tourne sur
// chacun, avec ses vrais segments localisés.
const FALLBACK_TYPES = PAGE_TYPE_NAMES.filter((t) => PAGE_TYPES[t].model === 'fallback-fr');

describe.each(FALLBACK_TYPES)('checkSlugRedirects : %s', (type) => {
  const seg = (l: string) => ROUTES[type]![l]!.replace('/[slug]', '');

  it('aucun changement, ajout, traduction ajoutée ou retirée : conforme', () => {
    const before = card(type, 'a', { langs: ['fr', 'nl'] });
    expect(runT(type, before, before)).toEqual([]);
    expect(runT(type, before, [...before, ...card(type, 'b')])).toEqual([]);
    expect(runT(type, before, card(type, 'a'))).toEqual([]);
    expect(runT(type, before, card(type, 'a', { langs: ['fr'] }))).toEqual([]);
  });

  it('modification ordinaire du texte (même slug, brouillon levé) : conforme', () => {
    const before = card(type, 'a', { draft: true });
    expect(runT(type, before, card(type, 'a', { draft: false }))).toEqual([]);
  });

  it('slug renommé dans le même fichier : une redirection par langue, segments localisés', () => {
    const v = runT(type, card(type, 'a', { file: 'a' }), card(type, 'a-bis', { file: 'a' }));
    expect(kinds(v)).toEqual(Array(4).fill('missing-redirect'));
    expect(v.map((x) => x.fix).sort(byFrom)).toEqual(
      LOCALES.map((l) => ({ from: `/${l}${seg(l)}/a`, to: `/${l}${seg(l)}/a-bis` })),
    );
  });

  it('fichier renommé (git) avec nouveau slug : redirections exigées, puis conformes', () => {
    const renames = new Map(LOCALES.map((l) => [`${PAGE_TYPES[type].dir}/a.${l}.mdx`, `${PAGE_TYPES[type].dir}/b.${l}.mdx`]));
    const v = runT(type, card(type, 'a'), card(type, 'b'), { renames });
    expect(kinds(v)).toEqual(Array(4).fill('missing-redirect'));
    expect(runT(type, card(type, 'a'), card(type, 'b'), { renames, redirects: v.map((x) => x.fix!) })).toEqual([]);
  });

  it('fiche supprimée sans décision : échec ; avec retrait ou redirection : conforme', () => {
    const before = [...card(type, 'a'), ...card(type, 'b')];
    const after = card(type, 'b');
    const v = runT(type, before, after);
    expect(kinds(v)).toEqual(Array(4).fill('deleted-without-decision'));
    expect(v[0]!.message).toContain('URLS_RETIREES');
    const decisions: Extra = {
      redirects: [{ from: `/fr${seg('fr')}/a`, to: `/fr${seg('fr')}/b` }],
      retired: (['de', 'en', 'nl'] as const).map((l) => ({ path: `/${l}${seg(l)}/a`, raison: 'Fiche close.' })),
    };
    expect(runT(type, before, after, decisions)).toEqual([]);
  });

  it('brouillon supprimé : son URL était servie, décision exigée', () => {
    const v = runT(type, [...card(type, 'a', { draft: true }), ...card(type, 'b')], card(type, 'b'));
    expect(kinds(v)).toEqual(Array(4).fill('deleted-without-decision'));
  });

  it('carte FR supprimée, traduction NL gardée : FR/EN/DE répondraient 404', () => {
    const v = runT(type, card(type, 'a', { langs: ['fr', 'nl'] }), card(type, 'a', { langs: ['nl'] }));
    expect(kinds(v).filter((k) => k === 'unrenderable-page')).toHaveLength(3);
    expect(kinds(v).filter((k) => k === 'deleted-without-decision')).toHaveLength(3);
    expect(v.some((x) => x.message.includes(`/nl${seg('nl')}/a`))).toBe(false); // toujours servie
  });
});

describe('checkSlugRedirects : vérifications', () => {
  it('traduction ajoutée ou champ slug modifié : aucune URL perdue', () => {
    const before = verif('budget', '2026-02-08', ['fr', 'nl']);
    expect(runT('verifications', before, verif('budget', '2026-02-08'))).toEqual([]);
    expect(runT('verifications', before, verif('budget', '2026-02-08', ['fr', 'nl'], 'nouveau-slug'))).toEqual([]);
  });

  it('date corrigée dans le même fichier : redirection dans chaque langue de la fiche seulement', () => {
    const before = verif('budget', '2026-02-08', ['fr', 'nl']);
    const after = before.map((e) => ({ ...e, date: '2026-02-09' }));
    const v = runT('verifications', before, after);
    expect(v.map((x) => x.fix).sort(byFrom)).toEqual([
      { from: '/fr/verifications/budget-2026-02-08', to: '/fr/verifications/budget-2026-02-09' },
      { from: '/nl/verificaties/budget-2026-02-08', to: '/nl/verificaties/budget-2026-02-09' },
    ]);
  });

  it('traduction EN supprimée : son URL (sans repli) est perdue, décision exigée', () => {
    const v = runT('verifications', verif('budget', '2026-02-08'), verif('budget', '2026-02-08', ['fr', 'nl', 'de']));
    expect(kinds(v)).toEqual(['deleted-without-decision']);
    expect(v[0]!.message).toContain('/en/verifications/budget-2026-02-08');
  });
});

describe('checkSlugRedirects : segment localisé changé dans routing.ts', () => {
  const renamed = { ...ROUTES, sectors: { ...ROUTES.sectors, fr: '/filieres/[slug]' } };
  const content = { sectors: [...card('sectors', 'horeca'), ...card('sectors', 'tech')] };
  const before = snap(content);
  const after = snap(content, { routes: renamed });
  const pattern = { from: '/fr/secteurs/:slug', to: '/fr/filieres/:slug' };

  it('toutes les pages du type dans cette langue sont perdues : un seul échec, entrée générique proposée', () => {
    const v = runSnap(before, after);
    expect(kinds(v)).toEqual(['segment-changed']);
    expect(v[0]!.fix).toEqual(pattern);
    expect(v[0]!.message).toContain('2 page(s)');
  });

  it('avec l’entrée générique : conforme', () => {
    expect(runSnap(before, after, { redirects: [pattern] })).toEqual([]);
  });

  it('les redirections exactes, une par page, conviennent aussi', () => {
    expect(
      runSnap(before, after, {
        redirects: [
          { from: '/fr/secteurs/horeca', to: '/fr/filieres/horeca' },
          { from: '/fr/secteurs/tech', to: '/fr/filieres/tech' },
        ],
      }),
    ).toEqual([]);
  });

  it('segment ET slug changés : l’entrée générique mène au mauvais endroit, entrée exacte AVANT exigée', () => {
    const after2 = snap({ sectors: [...card('sectors', 'horeca-bxl', { file: 'horeca' }), ...card('sectors', 'tech')] }, { routes: renamed });
    const v = runSnap(before, after2, {
      redirects: [pattern, ...(['de', 'en', 'nl'] as const).map((l) => ({ from: `/${l}${ROUTES.sectors![l]!.replace('/[slug]', '')}/horeca`, to: `/${l}${ROUTES.sectors![l]!.replace('/[slug]', '')}/horeca-bxl` }))],
    });
    expect(kinds(v)).toEqual(['wrong-target']);
    expect(v[0]!.message).toContain('AVANT');
    expect(v[0]!.fix).toEqual({ from: '/fr/secteurs/horeca', to: '/fr/filieres/horeca-bxl' });
    const nl = { from: '/nl/sectoren/horeca', to: '/nl/sectoren/horeca-bxl' };
    const de = { from: '/de/sektoren/horeca', to: '/de/sektoren/horeca-bxl' };
    const en = { from: '/en/sectors/horeca', to: '/en/sectors/horeca-bxl' };
    // Exacte placée avant la générique : conforme.
    expect(runSnap(before, after2, { redirects: [v[0]!.fix!, pattern, nl, de, en] })).toEqual([]);
    // Exacte placée après : jamais atteinte par Next.
    expect(kinds(runSnap(before, after2, { redirects: [pattern, v[0]!.fix!, nl, de, en] }))).toContain('duplicate-from');
  });

  it('chemin supprimé de routing.ts pour une langue : échec', () => {
    const { fr: _fr, ...rest } = ROUTES.sectors!;
    void _fr;
    const v = runSnap(before, snap(content, { routes: { ...ROUTES, sectors: rest } }), { redirects: [] });
    expect(kinds(v)).toContain('route-missing');
  });

  it('un changement de segment d’un autre type ne touche pas les secteurs', () => {
    const other = { ...ROUTES, domains: { ...ROUTES.domains, fr: '/politiques/[slug]' } };
    expect(runSnap(before, snap(content, { routes: other }))).toEqual([]);
  });
});

describe('checkSlugRedirects : validité de la table', () => {
  const same = dossier('acs');
  const check = (redirects: Redirect[], dossiers = same) => kinds(run(dossiers, dossiers, { redirects }));
  const withDomain = snap({ dossiers: same, domains: card('domains', 'mobility') });
  const checkAll = (redirects: Redirect[]) => kinds(runSnap(withDomain, withDomain, { redirects }));

  it('boucle A → B → A', () => {
    expect(
      check([
        { from: '/fr/dossiers/x', to: '/fr/dossiers/y' },
        { from: '/fr/dossiers/y', to: '/fr/dossiers/x' },
      ]),
    ).toEqual(['loop']);
  });

  it('chaîne A → B → C', () => {
    expect(
      check([
        { from: '/fr/dossiers/x', to: '/fr/dossiers/y' },
        { from: '/fr/dossiers/y', to: '/fr/dossiers/acs' },
      ]),
    ).toEqual(['chain']);
  });

  it('deux entrées pour le même from', () => {
    expect(
      check([
        { from: '/fr/dossiers/x', to: '/fr/dossiers/acs' },
        { from: '/fr/dossiers/x', to: '/fr/dossiers' },
      ]),
    ).toEqual(['duplicate-from']);
  });

  it('langue différente des deux côtés', () => {
    expect(check([{ from: '/nl/dossiers/x', to: '/fr/dossiers/acs' }])).toEqual(['locale-mismatch']);
  });

  it('cible inexistante', () => {
    expect(check([{ from: '/fr/dossiers/x', to: '/fr/dossiers/nulle-part' }])).toEqual(['target-missing']);
  });

  it('cible hors des dossiers : admise si c’est une page servie (domaine, index, page statique)', () => {
    expect(checkAll([{ from: '/fr/dossiers/x', to: '/fr/domaines/mobility' }])).toEqual([]);
    expect(checkAll([{ from: '/nl/domeinen/oud', to: '/nl/domeinen/mobility' }])).toEqual([]);
    expect(checkAll([{ from: '/fr/domaines/ancien', to: '/fr/domaines' }])).toEqual([]);
    expect(checkAll([{ from: '/fr/communes/x', to: '/fr/chronologie' }])).toEqual([]);
  });

  it('cible hors des dossiers inexistante, ou dans un segment d’une autre langue : refusée', () => {
    expect(checkAll([{ from: '/fr/dossiers/x', to: '/fr/domaines/nulle-part' }])).toEqual(['target-missing']);
    // /fr/domains/… : segment anglais sous préfixe français, pas une URL servie.
    expect(checkAll([{ from: '/fr/dossiers/x', to: '/fr/domains/mobility' }])).toEqual(['target-missing']);
  });

  it('from qui est une page servie d’un autre type : elle deviendrait inaccessible', () => {
    expect(checkAll([{ from: '/en/domains/mobility', to: '/en/dossiers/acs' }])).toEqual(['shadows-live-page']);
  });

  it('chemin sans langue, avec barre finale, requête, ou caractère de motif Next', () => {
    expect(
      check([
        { from: '/dossiers/x', to: '/fr/dossiers/acs' },
        { from: '/fr/dossiers/y/', to: '/fr/dossiers/acs' },
        { from: '/fr/dossiers/z', to: '/fr/dossiers/acs?a=1' },
        { from: '/fr/dossiers/:id', to: '/fr/dossiers/acs' },
        { from: '/fr/dossiers/w(.*)', to: '/fr/dossiers/acs' },
      ]),
    ).toEqual(Array(5).fill('invalid-path'));
  });

  it('entrée générique : motif des deux côtés seulement, :slug en dernier segment', () => {
    expect(
      checkAll([
        { from: '/fr/secteurs/:slug', to: '/fr/domaines' },
        { from: '/fr/secteurs/:slug/scrolly', to: '/fr/filieres/:slug/scrolly' },
        { from: '/fr/secteurs/:slug*', to: '/fr/filieres/:slug*' },
      ]),
    ).toEqual(Array(3).fill('invalid-path'));
  });

  it('entrée générique qui capterait des pages servies', () => {
    expect(checkAll([{ from: '/fr/domaines/:slug', to: '/fr/dossiers/:slug' }])).toContain('shadows-live-page');
  });

  it('entrée générique vers un chemin qui n’est celui d’aucun type', () => {
    expect(checkAll([{ from: '/fr/anciens/:slug', to: '/fr/nulle-part/:slug' }])).toEqual(['target-missing']);
    expect(checkAll([{ from: '/fr/anciens/:slug', to: '/fr/domaines/:slug' }])).toEqual([]);
  });

  it('chaîne à travers une entrée générique', () => {
    const v = checkAll([
      { from: '/fr/a/:slug', to: '/fr/b/:slug' },
      { from: '/fr/b/:slug', to: '/fr/domaines/:slug' },
    ]);
    expect(v).toEqual(['chain']);
  });

  it('redirection vers elle-même', () => {
    expect(check([{ from: '/fr/dossiers/x', to: '/fr/dossiers/x' }])).toContain('self-redirect');
  });

  it('from qui est une page servie : elle deviendrait inaccessible', () => {
    expect(check([{ from: '/fr/dossiers/acs', to: '/fr/dossiers' }])).toEqual(['shadows-live-page']);
  });

  it('URL retirée encore servie, sans raison, ou aussi redirigée', () => {
    const v = kinds(
      run(same, same, {
        redirects: [{ from: '/fr/dossiers/old', to: '/fr/dossiers/acs' }],
        retired: [
          { path: '/fr/dossiers/acs', raison: 'x' },
          { path: '/fr/dossiers/y', raison: ' ' },
          { path: '/fr/dossiers/old', raison: 'x' },
        ],
      }),
    );
    expect(v).toEqual(['invalid-retired', 'invalid-retired', 'invalid-retired']);
  });
});

describe('lecture des sources', () => {
  it('parseScrollyAllowlist lit la vraie liste du dépôt', () => {
    const src = fs.readFileSync(path.join(__dirname, 'scrolly-allowlist.ts'), 'utf8');
    const parsed = parseScrollyAllowlist(src);
    expect(parsed).not.toBeNull();
    expect(parsed!.has('cpas-bruxellois')).toBe(true);
  });

  it('parseScrollyAllowlist ignore les commentaires et rend null si le bloc manque', () => {
    expect(
      [...parseScrollyAllowlist("export const SCROLLY_ENABLED_DOSSIERS: ReadonlySet<string> = new Set([\n  'a',\n  // 'b',\n]);")!],
    ).toEqual(['a']);
    expect(parseScrollyAllowlist('export const X = 1;')).toBeNull();
  });

  it('parseSlugPathnames lit dans le source de routing.ts exactement l’objet importé', () => {
    const parsed = parseSlugPathnames(ROUTING_SRC, routing.locales)!;
    const expected: Record<string, RouteTemplates> = {};
    for (const [k, v] of Object.entries(routing.pathnames)) {
      if (!k.includes('[slug]')) continue;
      expected[k] = typeof v === 'string' ? Object.fromEntries(routing.locales.map((l) => [l, v])) : { ...(v as object) };
    }
    expect(parsed).toEqual(expected);
  });

  it('parseSlugPathnames ignore une entrée commentée et rend null sans bloc pathnames', () => {
    const src = "pathnames: {\n  // '/x/[slug]': '/x/[slug]',\n  '/y/[slug]': { fr: '/why/[slug]', nl: '/waarom/[slug]' },\n}";
    expect(parseSlugPathnames(src, ['fr', 'nl'])).toEqual({ '/y/[slug]': { fr: '/why/[slug]', nl: '/waarom/[slug]' } });
    expect(parseSlugPathnames('export const x = 1;', ['fr'])).toBeNull();
  });
});

/**
 * Le modèle recopie les routes. Si une route change (nouveau [slug], filtre
 * draft, repli supprimé, generateStaticParams réécrit), ces tests tombent et
 * forcent la mise à jour de PAGE_TYPES et du modèle, au lieu d'un contrôle qui
 * continuerait de répondre OK sur des URL qui ne sont plus les bonnes.
 */
describe('le modèle suit les routes réelles', () => {
  const APP = path.join(ROOT, 'src/app/[locale]');
  const norm = (s: string) => s.replace(/\s+/g, ' ');
  const pageSrc = (type: PageType) => norm(fs.readFileSync(path.join(APP, PAGE_TYPES[type].route, 'page.tsx'), 'utf8'));
  const contentSrc = norm(fs.readFileSync(path.join(ROOT, 'src/lib/content.ts'), 'utf8'));

  it('PAGE_TYPES couvre exactement les routes src/app/[locale]/*/[slug]', () => {
    const dirs = fs
      .readdirSync(APP, { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(path.join(APP, d.name, '[slug]', 'page.tsx')))
      .map((d) => `/${d.name}/[slug]`)
      .sort();
    expect(PAGE_TYPE_NAMES.map((t) => PAGE_TYPES[t].route).sort()).toEqual(dirs);
  });

  it('PAGE_TYPES couvre exactement les entrées [slug] de routing.ts', () => {
    const keys = Object.keys(routing.pathnames).filter((k) => k.includes('[slug]')).sort();
    expect(PAGE_TYPE_NAMES.map((t) => PAGE_TYPES[t].route).sort()).toEqual(keys);
  });

  it('le pré-vol déclenche la garde sur chaque dossier de contenu gardé et sur routing.ts', () => {
    const pre = fs.readFileSync(path.join(ROOT, 'scripts/preflight.sh'), 'utf8');
    const re = /2 septies[\s\S]*?grep -qE '([^']+)'/.exec(pre)?.[1];
    expect(re).toBeDefined();
    const rx = new RegExp(re!);
    for (const t of PAGE_TYPE_NAMES) expect(rx.test(`${PAGE_TYPES[t].dir}/x.fr.mdx`), t).toBe(true);
    for (const t of PAGE_TYPE_NAMES) expect(rx.test(`src/app/[locale]${PAGE_TYPES[t].route}/page.tsx`), t).toBe(true);
    expect(rx.test('src/i18n/routing.ts')).toBe(true);
    expect(rx.test('content/glossary/x.fr.mdx')).toBe(false);
  });

  it('chaque dossier de contenu existe', () => {
    for (const t of PAGE_TYPE_NAMES) expect(fs.existsSync(path.join(ROOT, PAGE_TYPES[t].dir)), t).toBe(true);
  });

  it('toutes les routes : dynamicParams = false (une URL non émise répond 404)', () => {
    for (const t of PAGE_TYPE_NAMES) expect(pageSrc(t), t).toContain('export const dynamicParams = false;');
  });

  const FALLBACK: Record<string, { all: string; get: string; coll: string }> = {
    domains: { all: 'getAllDomainSlugs', get: 'getDomainCard', coll: 'domainCards' },
    solutions: { all: 'getAllSolutionSlugs', get: 'getSolutionCard', coll: 'solutionCards' },
    sectors: { all: 'getAllSectorSlugs', get: 'getSectorCard', coll: 'sectorCards' },
    comparisons: { all: 'getAllComparisonSlugs', get: 'getComparisonCard', coll: 'comparisonCards' },
    communes: { all: 'getAllCommuneSlugs', get: 'getCommuneCard', coll: 'communeCards' },
    archives: { all: 'getAllArchiveSlugs', get: 'getArchivePage', coll: 'archivePages' },
  };

  it('le tableau des accesseurs couvre tous les types à repli FR', () => {
    expect(Object.keys(FALLBACK).sort()).toEqual([...FALLBACK_TYPES].sort());
  });

  it.each(Object.entries(FALLBACK))('%s : tous les slugs, toutes langues, carte de la langue sinon FR', (type, a) => {
    const page = pageSrc(type as PageType);
    expect(page).toContain(
      `export function generateStaticParams() { const slugs = ${a.all}(); return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug }))); }`,
    );
    expect(page).toContain(`const result = ${a.get}(slug, locale as Locale); if (!result) notFound();`);
    // getAll…Slugs : aucun filtre (ni langue ni brouillon).
    const all = new RegExp(`export function ${a.all}\\(\\): string\\[\\] \\{ const \\{ ${a.coll} \\} = getCollections\\(\\); return \\[\\.\\.\\.new Set\\(${a.coll}\\.map\\(\\((\\w)(?:: \\w+)?\\) => \\1\\.slug\\)\\)\\]; \\}`);
    expect(contentSrc).toMatch(all);
    // get…Card : carte exacte, puis repli FR, puis null ; rien d'autre.
    const body = new RegExp(`export function ${a.get}\\([^)]*\\)[^{]*\\{(.*?)\\n?\\} (?:export|/\\*\\*|//)`).exec(contentSrc)?.[1] ?? '';
    expect(body).toMatch(/\.slug === slug && \w\.locale === locale/);
    expect(body).toMatch(/\.slug === slug && \w\.locale === 'fr'/);
    expect(body).not.toContain('draft');
  });

  it('dossiers : generateStaticParams et rendu passent par les accesseurs réutilisés', () => {
    const page = pageSrc('dossiers');
    expect(page).toContain('params.push({ locale, slug: getLocalizedSlug(card, locale) });');
    expect(page).toContain('const frResult = getDossierCard(canonicalSlug, \'fr\' as Locale);');
    expect(page).toContain('const result = getDossierByLocalizedSlug(slug, locale as Locale); if (!result) notFound();');
    const scrolly = norm(fs.readFileSync(path.join(APP, 'dossiers/[slug]/scrolly/page.tsx'), 'utf8'));
    expect(scrolly).toContain('for (const canonicalSlug of SCROLLY_ENABLED_DOSSIERS)');
    expect(scrolly).toContain('if (result && !result.isFallback)');
  });

  it('vérifications : une page par langue existante, sans repli', () => {
    const page = pageSrc('verifications');
    expect(page).toContain('getVerificationSlugs(locale).map((slug) => ({ locale, slug }))');
    expect(page).toContain('const verification = getVerification(slug, locale as Locale); if (!verification) notFound();');
    expect(contentSrc).toContain('.filter((v) => v.locale === locale) .map(idDeVerification)');
  });
});

describe('table réelle', () => {
  it('SLUG_REDIRECTS_301 et URLS_RETIREES sont bien formées (sans contenu : forme seule)', () => {
    // Le contrôle complet, contre le contenu réel, tourne en CI via
    // scripts/content-lint/slug-redirects.ts. Ici, seules les règles qui ne
    // dépendent pas du contenu : chemins, langue, doublons, chaînes, boucles.
    const v = checkSlugRedirects({
      locales: LOCALES,
      before: snap({}),
      after: snap({}),
      redirects: SLUG_REDIRECTS_301,
      retired: URLS_RETIREES,
    }).filter((x) => x.kind !== 'target-missing');
    expect(v).toEqual([]);
  });

  it('getRedirectsConfig garde l’ordre de la table (Next applique la première entrée qui correspond)', () => {
    expect(getRedirectsConfig().map((r) => r.source)).toEqual(SLUG_REDIRECTS_301.map((r) => r.from));
  });
});
