// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { findDuplicateSources, normalizeSourceUrl } from './duplicate-sources';

const LALIBRE =
  'https://www.lalibre.be/belgique/societe/2026/08/22/stib-slrb-kanal-a-bruxelles-les-partis-bouclent-enfin-le-grand-partage-des-mandats-dans-les-conseils-dadministration-YPMIHSZYIFHYJOA2DJ6V7ISJYQ';

describe('findDuplicateSources', () => {
  it("attrape le doublon réel de domain-cards/institutional.fr (même article, deux libellés, deux veilles)", () => {
    const d = findDuplicateSources([
      { label: "La Libre — STIB, SLRB, Kanal : les partis bouclent le partage des mandats dans les conseils d'administration (22 août 2026)", url: LALIBRE, accessedAt: '2026-08-22' },
      { label: 'Autre source', url: 'https://www.parlement.brussels/', accessedAt: '2026-08-22' },
      { label: "La Libre — Les partis bouclent le grand partage des mandats dans les conseils d'administration (22 août 2026)", url: LALIBRE, accessedAt: '2026-08-25' },
    ]);
    expect(d).toHaveLength(1);
    expect(d[0].url).toBe(LALIBRE);
    expect(d[0].labels).toHaveLength(2);
  });

  it('compare sans utm_*, sans fragment et sans barre finale', () => {
    const d = findDuplicateSources([
      { label: 'a', url: `${LALIBRE}/` },
      { label: 'b', url: `${LALIBRE}?utm_source=bluesky&utm_medium=social#paragraphe` },
    ]);
    expect(d).toHaveLength(1);
  });

  it('garde les autres paramètres : deux pages différentes restent deux sources', () => {
    expect(
      findDuplicateSources([
        { label: 'a', url: 'https://www.weblex.brussels/search?q=1' },
        { label: 'b', url: 'https://www.weblex.brussels/search?q=2' },
      ]),
    ).toEqual([]);
  });

  it('ignore une liste absente, vide ou sans URL', () => {
    expect(findDuplicateSources(undefined)).toEqual([]);
    expect(findDuplicateSources([])).toEqual([]);
    expect(findDuplicateSources([{ label: 'x' }, { label: 'y' }])).toEqual([]);
  });
});

describe('normalizeSourceUrl', () => {
  it("met l'hôte en minuscules et retire le « ? » laissé vide", () => {
    expect(normalizeSourceUrl('https://WWW.Example.be/Page/?utm_campaign=x')).toBe('https://www.example.be/Page');
  });
});
