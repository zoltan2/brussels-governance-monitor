import { describe, it, expect } from 'vitest';
import { parseTrafficStatus } from './traffic-status';

describe('parseTrafficStatus', () => {
  it('lit un instantané produit par le script du VPS', () => {
    const raw = {
      generatedAt: '2026-08-11T10:00:00Z',
      days: 7,
      visitors: 4415,
      pageviews: 15171,
      topPages: [
        { path: '/fr', views: 900 },
        { path: '/fr/dossiers', views: 400 },
      ],
    };
    expect(parseTrafficStatus(raw)).toEqual(raw);
  });

  it('accepte un instantané sans page en tête', () => {
    const out = parseTrafficStatus({
      generatedAt: '2026-08-11T10:00:00Z',
      days: 7,
      visitors: 0,
      pageviews: 0,
      topPages: [],
    });
    expect(out?.topPages).toEqual([]);
    expect(out?.visitors).toBe(0);
  });

  it('rend null quand les compteurs manquent, plutôt qu\'un faux zéro', () => {
    expect(parseTrafficStatus({ generatedAt: '2026-08-11T10:00:00Z' })).toBeNull();
    expect(parseTrafficStatus({ visitors: 10 })).toBeNull();
    expect(parseTrafficStatus(null)).toBeNull();
    expect(parseTrafficStatus('cassé')).toBeNull();
  });

  it('écarte les lignes de top pages mal formées sans tout perdre', () => {
    const out = parseTrafficStatus({
      visitors: 5,
      pageviews: 9,
      topPages: [{ path: '/fr', views: 900 }, { path: null, views: 5 }, 'cassé'],
    });
    expect(out?.topPages).toEqual([{ path: '/fr', views: 900 }]);
  });

  it('tolère un topPages absent ou du mauvais type', () => {
    expect(parseTrafficStatus({ visitors: 1, pageviews: 2 })?.topPages).toEqual(
      [],
    );
    expect(
      parseTrafficStatus({ visitors: 1, pageviews: 2, topPages: 'non' })
        ?.topPages,
    ).toEqual([]);
  });
});
