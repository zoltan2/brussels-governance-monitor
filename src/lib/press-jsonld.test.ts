// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { buildPressJsonLd } from './press-jsonld';
import { getPressMentions } from './press';

const SITE = 'https://governance.brussels';

function construire() {
  const mentions = getPressMentions('fr');
  const ld = buildPressJsonLd({
    siteUrl: SITE,
    pageUrl: `${SITE}/fr/presse`,
    locale: 'fr',
    name: 'Presse & données',
    description: 'desc',
    mentions,
  });
  return { ld, mentions, texte: JSON.stringify(ld) };
}

describe('buildPressJsonLd', () => {
  it('déclare une CollectionPage rattachée au site et à l’organisation du layout', () => {
    const { ld } = construire();
    expect(ld['@type']).toBe('CollectionPage');
    expect(ld.isPartOf).toEqual({ '@id': `${SITE}/#website` });
    expect(ld.about).toEqual({ '@id': `${SITE}/#organization` });
  });

  it('liste chaque mention une fois, par son URL', () => {
    const { ld, mentions } = construire();
    expect(ld.mainEntity['@type']).toBe('ItemList');
    expect(ld.mainEntity.numberOfItems).toBe(mentions.length);
    expect(ld.mainEntity.itemListElement.map((i) => i.url)).toEqual(mentions.map((m) => m.url));
    expect(ld.mainEntity.itemListElement.map((i) => i.position)).toEqual(mentions.map((_, i) => i + 1));
  });

  it('ne publie ni NewsArticle, ni auteur, ni date d’un article tiers', () => {
    const { texte } = construire();
    expect(texte).not.toMatch(/NewsArticle|"Article"|author|datePublished|dateModified/);
    // Ce qui part est du JSON valide.
    expect(() => JSON.parse(texte)).not.toThrow();
  });
});
