// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkSlugRedirects,
  parseScrollyAllowlist,
  servedDossierUrls,
  type DossierSlugInfo,
  type Redirect,
  type RetiredUrl,
  type SlugRedirectInput,
} from './slug-redirects';
import { DOSSIER_URLS_RETIREES, SLUG_REDIRECTS_301 } from './redirects-301';

const LOCALES = ['de', 'en', 'fr', 'nl'] as const;
const NONE: ReadonlySet<string> = new Set();

/** Un dossier traduit dans les quatre langues, slugs localisés par langue. */
function dossier(
  slug: string,
  localizedSlugs?: Partial<Record<string, string>>,
  opts: { file?: string; langs?: readonly string[] } = {},
): DossierSlugInfo[] {
  const base = opts.file ?? slug;
  return (opts.langs ?? LOCALES).map((locale) => ({
    file: `content/dossiers/${base}.${locale}.mdx`,
    locale,
    slug,
    localizedSlugs,
  }));
}

function run(
  before: DossierSlugInfo[],
  after: DossierSlugInfo[],
  extra: Partial<SlugRedirectInput> & { redirects?: Redirect[]; retired?: RetiredUrl[] } = {},
) {
  return checkSlugRedirects({
    locales: LOCALES,
    before: { dossiers: before, scrollyAllowlist: extra.before?.scrollyAllowlist ?? NONE },
    after: { dossiers: after, scrollyAllowlist: extra.after?.scrollyAllowlist ?? NONE },
    renames: extra.renames,
    redirects: extra.redirects ?? [],
    retired: extra.retired ?? [],
  });
}

const kinds = (v: ReturnType<typeof run>) => v.map((x) => x.kind);

describe('servedDossierUrls', () => {
  it('sert une URL par langue, slug localisé de la carte FR sinon canonique', () => {
    const urls = servedDossierUrls(
      { dossiers: dossier('cpas-bruxellois', { nl: 'ocmw-brussel' }), scrollyAllowlist: NONE },
      LOCALES,
    ).served.map((s) => s.url);
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
    const urls = servedDossierUrls(
      { dossiers: dossier('acs', undefined, { langs: ['fr', 'nl'] }), scrollyAllowlist: new Set(['acs']) },
      LOCALES,
    ).served.map((s) => s.url);
    expect(urls).toContain('/fr/dossiers/acs/scrolly');
    expect(urls).toContain('/nl/dossiers/acs/scrolly');
    expect(urls).not.toContain('/de/dossiers/acs/scrolly');
    expect(urls).toContain('/de/dossiers/acs'); // repli FR de la page
  });
});

describe('checkSlugRedirects : URL perdues', () => {
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
    expect(v.map((x) => x.fix).sort((a, b) => a!.from.localeCompare(b!.from))).toEqual(
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
    expect(v[0]!.message).toContain('DOSSIER_URLS_RETIREES');
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
      before: { dossiers: [], scrollyAllowlist: allow },
      after: { dossiers: [], scrollyAllowlist: allow },
      redirects: [{ from: '/nl/dossiers/cpas-bruxellois', to: '/nl/dossiers/ocmw-brussel' }],
    });
    expect(v.map((x) => x.fix)).toEqual([
      { from: '/nl/dossiers/cpas-bruxellois/scrolly', to: '/nl/dossiers/ocmw-brussel/scrolly' },
    ]);
  });

  it('vue immersive retirée de la liste : redirection vers la page du dossier', () => {
    const v = run(dossier('acs', undefined, { langs: ['fr'] }), dossier('acs', undefined, { langs: ['fr'] }), {
      before: { dossiers: [], scrollyAllowlist: new Set(['acs']) },
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

describe('checkSlugRedirects : validité de la table', () => {
  const same = dossier('acs');
  const check = (redirects: Redirect[], dossiers = same) => kinds(run(dossiers, dossiers, { redirects }));

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

  it('cible hors des dossiers : refusée faute de pouvoir la vérifier', () => {
    expect(check([{ from: '/fr/dossiers/x', to: '/fr/domaines/mobilite' }])).toEqual(['target-missing']);
  });

  it('chemin sans langue, avec barre finale ou requête', () => {
    expect(
      check([
        { from: '/dossiers/x', to: '/fr/dossiers/acs' },
        { from: '/fr/dossiers/y/', to: '/fr/dossiers/acs' },
        { from: '/fr/dossiers/z', to: '/fr/dossiers/acs?a=1' },
      ]),
    ).toEqual(['invalid-path', 'invalid-path', 'invalid-path']);
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

describe('parseScrollyAllowlist', () => {
  it('lit la vraie liste du dépôt', () => {
    const src = fs.readFileSync(path.join(__dirname, 'scrolly-allowlist.ts'), 'utf8');
    const parsed = parseScrollyAllowlist(src);
    expect(parsed).not.toBeNull();
    expect(parsed!.has('cpas-bruxellois')).toBe(true);
  });

  it('ignore les commentaires et rend null si le bloc manque', () => {
    expect(
      [...parseScrollyAllowlist("export const SCROLLY_ENABLED_DOSSIERS: ReadonlySet<string> = new Set([\n  'a',\n  // 'b',\n]);")!],
    ).toEqual(['a']);
    expect(parseScrollyAllowlist('export const X = 1;')).toBeNull();
  });
});

describe('table réelle', () => {
  it('SLUG_REDIRECTS_301 et DOSSIER_URLS_RETIREES sont bien formées (sans contenu : forme seule)', () => {
    // Le contrôle complet, contre le contenu réel, tourne en CI via
    // scripts/content-lint/slug-redirects.ts. Ici, seules les règles qui ne
    // dépendent pas du contenu : chemins, langue, doublons, chaînes, boucles.
    const v = checkSlugRedirects({
      locales: LOCALES,
      before: { dossiers: [], scrollyAllowlist: NONE },
      after: { dossiers: [], scrollyAllowlist: NONE },
      redirects: SLUG_REDIRECTS_301,
      retired: DOSSIER_URLS_RETIREES,
    }).filter((x) => x.kind !== 'target-missing');
    expect(v).toEqual([]);
  });
});
