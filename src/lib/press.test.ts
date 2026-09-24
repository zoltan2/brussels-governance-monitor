// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Validité de `data/press-mentions.json`, la seule source de la revue de presse.
 * Le fichier est versionné : ce test ne lit jamais `.velite/`.
 */
import { describe, expect, it } from 'vitest';
import raw from '../../data/press-mentions.json';
import {
  PRESS_KINDS,
  getPressMentions,
  groupPressMentions,
  latestVerification,
  localizePressMentions,
  pressMentionsSchema,
} from './press';

const entrees = pressMentionsSchema.parse(raw);

describe('data/press-mentions.json', () => {
  it('passe le schéma strict (kind, dates ISO réelles, URL HTTPS, versions traduites)', () => {
    expect(() => pressMentionsSchema.parse(raw)).not.toThrow();
    expect(entrees.length).toBeGreaterThan(0);
  });

  it('a des identifiants uniques', () => {
    const ids = entrees.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('n’a aucune URL en double, versions traduites comprises', () => {
    const urls = entrees.flatMap((e) => [e.url, ...e.translatedVersions.map((v) => v.url)]);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('couvre les trois familles', () => {
    for (const kind of PRESS_KINDS) {
      expect(entrees.some((e) => e.kind === kind), kind).toBe(true);
    }
  });

  it('ne vérifie jamais avant la publication', () => {
    for (const e of entrees) {
      const date = e.publishedAt ?? e.updatedAt;
      if (date) expect(e.verifiedAt >= date, e.id).toBe(true);
    }
  });

  it('donne à chaque version traduite une autre langue que l’original', () => {
    for (const e of entrees) {
      for (const v of e.translatedVersions) expect(v.lang, e.id).not.toBe(e.lang);
    }
  });

  it('compte Information-Bruxelles une seule fois, avec sa version néerlandaise', () => {
    const ib = entrees.filter(
      (e) =>
        e.url.includes('information-bruxelles.be') ||
        e.translatedVersions.some((v) => v.url.includes('information-bruxelles.be')),
    );
    expect(ib).toHaveLength(1);
    expect(ib[0].translatedVersions.map((v) => v.lang)).toEqual(['nl']);
  });

  it('retient les dates affichées par les sources vérifiées le 24/09/2026', () => {
    const date = (id: string) => entrees.find((e) => e.id === id)?.publishedAt;
    // BRUZZ affiche 28/02/2026 (publishDate 07:00 UTC, 08:00 à Bruxelles).
    expect(date('bruzz-2026-02-28')).toBe('2026-02-28');
    // La Gazette affiche « 26 Fév 2026 », pas le 25 de l'ancien fichier.
    expect(date('gazette-de-bruxelles-2026-02-26')).toBe('2026-02-26');
  });
});

describe('schéma : refus', () => {
  const base = entrees[0];
  it.each([
    ['famille inconnue', { ...base, kind: 'feature' }],
    ['date inexistante', { ...base, publishedAt: '2026-02-30' }],
    ['URL non HTTPS', { ...base, url: 'http://example.org/a' }],
    ['champ inconnu', { ...base, type: 'feature' }],
    ['version traduite sans titre', { ...base, translatedVersions: [{ lang: 'nl', url: 'https://example.org/nl' }] }],
  ])('%s', (_, entree) => {
    expect(() => pressMentionsSchema.parse([entree])).toThrow();
  });
});

describe('localizePressMentions', () => {
  it('rend le contexte dans la langue et trie du plus récent au plus ancien', () => {
    const nl = getPressMentions('nl');
    const dates = nl.map((m) => m.publishedAt ?? m.updatedAt ?? '');
    expect([...dates].sort().reverse()).toEqual(dates);
    const wiki = nl.find((m) => m.id === 'wikipedia-fr-gouvernement-dillies');
    expect(wiki?.context).toMatch(/governance\.brussels/);
    expect(wiki?.context).not.toBe(entrees.find((e) => e.id === wiki?.id)?.context?.fr);
  });

  it('garde le titre original, jamais traduit', () => {
    for (const locale of ['fr', 'nl', 'en', 'de'] as const) {
      const bruzz = localizePressMentions(raw, locale).find((m) => m.id === 'bruzz-2026-02-28');
      expect(bruzz?.title).toBe('Wakkere burger lanceert superwebsite om Brussels beleid te volgen');
    }
  });

  it('regroupe par famille et date la dernière vérification', () => {
    const mentions = getPressMentions('fr');
    const g = groupPressMentions(mentions);
    expect(Object.keys(g)).toEqual([...PRESS_KINDS]);
    expect(PRESS_KINDS.reduce((n, k) => n + g[k].length, 0)).toBe(mentions.length);
    expect(latestVerification(mentions)).toBe(
      [...mentions.map((m) => m.verifiedAt)].sort().at(-1),
    );
  });
});
