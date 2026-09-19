// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Garde-fous du texte de /explainers/brussels-paradox, réécrit le 19/09/2026.
// Le test de parité global ne compare que fr et nl : ici, les quatre langues,
// et les mêmes chiffres dans le tableau quelle que soit la langue.

import { describe, it, expect } from 'vitest';
import fr from '../../../messages/fr.json';
import nl from '../../../messages/nl.json';
import en from '../../../messages/en.json';
import de from '../../../messages/de.json';

type Tree = { [key: string]: string | Tree };

const NAMESPACES: Record<string, Tree> = {
  fr: fr.explainers.brusselsParadox as unknown as Tree,
  nl: nl.explainers.brusselsParadox as unknown as Tree,
  en: en.explainers.brusselsParadox as unknown as Tree,
  de: de.explainers.brusselsParadox as unknown as Tree,
};

function entries(tree: Tree, prefix = ''): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [[path, value] as [string, string]] : entries(value, path);
  });
}

const prose = (locale: string) => entries(NAMESPACES[locale]).filter(([path]) => !path.endsWith('.url'));

describe('explainers.brusselsParadox', () => {
  it('a exactement les mêmes clés dans les quatre langues', () => {
    const frKeys = entries(NAMESPACES.fr).map(([path]) => path).sort();
    for (const locale of ['nl', 'en', 'de']) {
      expect(entries(NAMESPACES[locale]).map(([path]) => path).sort(), locale).toEqual(frKeys);
    }
  });

  it("n'a plus les anciennes clés", () => {
    for (const tree of Object.values(NAMESPACES)) {
      for (const old of ['income', 'transfers', 'whyMatters']) expect(tree[old]).toBeUndefined();
      expect((tree.gdp as Tree).description).toBeUndefined();
      expect((tree.commuters as Tree).description).toBeUndefined();
    }
  });

  it('affiche les mêmes chiffres dans le tableau, quelle que soit la langue', () => {
    const digits = (locale: string) =>
      entries(NAMESPACES[locale])
        .filter(([path]) => /^table\.rows\.\w+\.(bru|fla|wal|bel)$/.test(path))
        .map(([path, value]) => [path, value.replace(/[^\d]/g, '')]);
    expect(digits('fr')).toHaveLength(20);
    for (const locale of ['nl', 'en', 'de']) expect(digits(locale), locale).toEqual(digits('fr'));
  });

  it('respecte les longueurs de titre et de description pour les moteurs de recherche', () => {
    for (const [locale, tree] of Object.entries(NAMESPACES)) {
      expect((tree.metaTitle as string).length, locale).toBeLessThanOrEqual(60);
      expect((tree.metaDescription as string).length, locale).toBeLessThanOrEqual(155);
    }
  });

  it('ne contient ni tiret cadratin ni demi-cadratin', () => {
    for (const locale of Object.keys(NAMESPACES)) {
      for (const [path, value] of prose(locale)) expect(value, `${locale} ${path}`).not.toMatch(/[—–]/);
    }
  });

  it("écrit le sigle de l'institut bruxellois de statistique selon la langue", () => {
    for (const [path, value] of prose('nl')) expect(value, `nl ${path}`).not.toMatch(/\bIBSA\b/);
    for (const locale of ['fr', 'en', 'de']) {
      for (const [path, value] of prose(locale)) expect(value, `${locale} ${path}`).not.toMatch(/\bBISA\b/);
    }
    const nlIbsa = (NAMESPACES.nl.method as Tree).sources as Tree;
    expect((nlIbsa.ibsa as Tree).url).toMatch(/^https:\/\/bisa\.brussels\//);
  });

  it('pose des espaces insécables dans le texte français', () => {
    for (const [path, value] of prose('fr')) {
      expect(value, path).not.toMatch(/ [:;?!%€»]/);
      expect(value, path).not.toMatch(/\d \d{3}(?!\d)/);
    }
  });

  it('ne cite que des sources en https', () => {
    for (const locale of Object.keys(NAMESPACES)) {
      const urls = entries(NAMESPACES[locale]).filter(([path]) => path.endsWith('.url'));
      expect(urls.length).toBe(11);
      for (const [path, url] of urls) expect(url, `${locale} ${path}`).toMatch(/^https:\/\/[^\s]+$/);
    }
  });
});
