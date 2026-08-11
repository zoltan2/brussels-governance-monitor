import { describe, it, expect } from 'vitest';
import { parseStats, parseTopPages } from './umami';

describe('parseStats', () => {
  it('extrait visiteurs et pages vues', () => {
    expect(
      parseStats({
        pageviews: 15171,
        visitors: 4415,
        visits: 5680,
        bounces: 3567,
      }),
    ).toEqual({ visitors: 4415, pageviews: 15171 });
  });

  it('accepte la forme objet des versions récentes', () => {
    expect(
      parseStats({ pageviews: { value: 120 }, visitors: { value: 45 } }),
    ).toEqual({ visitors: 45, pageviews: 120 });
  });

  it('rend null sur une réponse inexploitable', () => {
    expect(parseStats(null)).toBeNull();
    expect(parseStats({ erreur: 'unauthorized' })).toBeNull();
    expect(parseStats('bonjour')).toBeNull();
  });
});

describe('parseTopPages', () => {
  it('convertit les paires x/y et respecte la limite', () => {
    const raw = [
      { x: '/fr', y: 900 },
      { x: '/fr/dossiers', y: 400 },
      { x: '/nl', y: 100 },
    ];
    expect(parseTopPages(raw, 2)).toEqual([
      { path: '/fr', views: 900 },
      { path: '/fr/dossiers', views: 400 },
    ]);
  });

  it('écarte les entrées mal formées sans lever', () => {
    const raw = [{ x: '/fr', y: 900 }, { x: null, y: 5 }, { y: 3 }, 'cassé'];
    expect(parseTopPages(raw, 10)).toEqual([{ path: '/fr', views: 900 }]);
  });

  it("rend un tableau vide quand la réponse n'est pas une liste", () => {
    expect(parseTopPages({ error: 'nope' }, 5)).toEqual([]);
  });
});
