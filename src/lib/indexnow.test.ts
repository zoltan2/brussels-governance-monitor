// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CLE,
  HOTE,
  corpsDeLaDemande,
  lireSitemap,
  urlsModifiees,
} from '../../scripts/ops/indexnow.mjs';

const sitemap = (entrees: Array<[string, string?]>) =>
  `<?xml version="1.0"?><urlset>${entrees
    .map(([loc, lastmod]) => `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
    .join('\n')}</urlset>`;

const B = 'https://governance.brussels';

describe('IndexNow : lecture du sitemap', () => {
  it('associe chaque URL à sa date de modification', () => {
    const lu = lireSitemap(sitemap([[`${B}/fr`, '2026-10-07T00:00:00.000Z'], [`${B}/fr/faq`]]));
    expect(lu.get(`${B}/fr`)).toBe('2026-10-07T00:00:00.000Z');
    expect(lu.get(`${B}/fr/faq`)).toBe('');
    expect(lu.size).toBe(2);
  });

  it('ne prend pas les liens hreflang pour des pages', () => {
    const xml = `<urlset><url><loc>${B}/fr/a</loc><xhtml:link rel="alternate" hreflang="nl" href="${B}/nl/a" /><lastmod>2026-10-01</lastmod></url></urlset>`;
    expect([...lireSitemap(xml).keys()]).toEqual([`${B}/fr/a`]);
  });

  it('décode les entités XML des adresses', () => {
    expect([...lireSitemap(sitemap([[`${B}/fr/a?x=1&amp;y=2`, '2026-10-01']])).keys()]).toEqual([`${B}/fr/a?x=1&y=2`]);
  });
});

describe('IndexNow : pages à annoncer', () => {
  const avant = lireSitemap(sitemap([[`${B}/fr/a`, '2026-10-01'], [`${B}/fr/b`, '2026-10-01'], [`${B}/fr/c`, '2026-10-01']]));

  it('annonce une page dont la date a changé et une page nouvelle, rien d’autre', () => {
    const apres = lireSitemap(sitemap([[`${B}/fr/a`, '2026-10-01'], [`${B}/fr/b`, '2026-10-07'], [`${B}/fr/d`, '2026-10-07']]));
    expect(urlsModifiees(avant, apres)).toEqual([`${B}/fr/b`, `${B}/fr/d`]);
  });

  it('n’annonce rien quand rien n’a changé', () => {
    expect(urlsModifiees(avant, avant)).toEqual([]);
  });

  /**
   * Premier passage, ou repère perdu : sans état précédent, tout le sitemap
   * paraîtrait nouveau. Annoncer 680 pages à chaque perte de repère serait du
   * bruit ; on n'annonce rien et on pose le repère.
   */
  it('n’annonce rien sans état précédent', () => {
    expect(urlsModifiees(null, avant)).toEqual([]);
  });

  it('écarte une adresse qui ne serait pas sur le site', () => {
    const apres = lireSitemap(sitemap([['https://exemple.org/x', '2026-10-07'], [`${B}/fr/b`, '2026-10-07']]));
    expect(urlsModifiees(avant, apres)).toEqual([`${B}/fr/b`]);
  });
});

describe('IndexNow : demande envoyée', () => {
  it('porte l’hôte, la clé et l’adresse du fichier de clé', () => {
    expect(corpsDeLaDemande([`${B}/fr/b`])).toEqual({
      host: HOTE,
      key: CLE,
      keyLocation: `https://${HOTE}/${CLE}.txt`,
      urlList: [`${B}/fr/b`],
    });
  });

  /**
   * Le moteur ne tient compte d'une annonce que s'il retrouve la clé à l'adresse
   * indiquée. Un fichier renommé ou vidé rendrait toutes les annonces sans effet,
   * sans aucune erreur visible de notre côté.
   */
  it('correspond au fichier de clé servi par le site', () => {
    const fichier = join(process.cwd(), 'public', `${CLE}.txt`);
    expect(existsSync(fichier)).toBe(true);
    expect(readFileSync(fichier, 'utf8')).toBe(CLE);
    expect(CLE).toMatch(/^[a-f0-9]{32}$/);
  });
});
