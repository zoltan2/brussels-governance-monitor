// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Le repli Upstash du journal des précommandes n'avait AUCUN test : les tests
 * de `preorder-log.test.ts` posent `DB_PATH` et prennent donc toujours la
 * branche SQLite. La revue adverse du 08/09/2026 a montré que la lecture y
 * était morte, et que le dédoublonnage n'y suivait pas la même règle.
 *
 * Ce fichier n'a délibérément PAS de `DB_PATH`, pour exercer l'autre moitié.
 *
 * Le piège central : `@upstash/redis` désérialise déjà tout seul
 * (`parseRecursive`), donc un membre relu n'est pas forcément une chaîne.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Faux Upstash minimal, fidèle sur le point qui compte : il rend les membres
// tels que le vrai SDK les rendrait après sa désérialisation automatique.
const store = {
  zset: new Map<string, number>(),
  hash: new Map<string, string>(),
};

const redisMock = {
  zadd: vi.fn(
    async (
      _key: string,
      opts: { nx?: boolean },
      entry: { score: number; member: string },
    ) => {
      if (opts?.nx && store.zset.has(entry.member)) return 0;
      store.zset.set(entry.member, entry.score);
      return 1;
    },
  ),
  hsetnx: vi.fn(async (_key: string, field: string, value: string) => {
    if (store.hash.has(field)) return 0;
    store.hash.set(field, value);
    return 1;
  }),
  hgetall: vi.fn(async () => Object.fromEntries(store.hash)),
  zrange: vi.fn(async (_key: string, min: number) => {
    const out: (string | number)[] = [];
    for (const [member, score] of [...store.zset].sort((a, b) => a[1] - b[1])) {
      if (score >= min) out.push(member, score);
    }
    return out;
  }),
};

vi.mock('@upstash/redis', () => ({
  Redis: class {
    zadd = redisMock.zadd;
    hsetnx = redisMock.hsetnx;
    hgetall = redisMock.hgetall;
    zrange = redisMock.zrange;
  },
}));

process.env.UPSTASH_REDIS_REST_URL = 'https://exemple.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'jeton-de-test';
delete process.env.DB_PATH;

const { recordPreorder, listPreordersSince } = await import('./preorder-log');

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  store.zset.clear();
  store.hash.clear();
});

describe('journal des précommandes — repli Upstash', () => {
  it('relit ce qui a été écrit', async () => {
    await recordPreorder({ email: 'nathalie@example.be', firstName: 'Nathalie' });

    const rows = await listPreordersSince(Date.now() - 7 * DAY);

    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('nathalie@example.be');
    expect(rows[0].firstName).toBe('Nathalie');
    expect(rows[0].created_at).toBeGreaterThan(Date.now() - 60_000);
  });

  it('dédoublonne sur la seule adresse, comme SQLite', async () => {
    // Le membre contenait autrefois le prénom : deux graphies du même prénom
    // créaient deux entrées ici et une seule en SQLite.
    await recordPreorder({ email: 'marc@example.be', firstName: 'Marc' });
    await recordPreorder({ email: 'marc@example.be', firstName: 'marc' });

    const rows = await listPreordersSince(Date.now() - 7 * DAY);

    expect(rows).toHaveLength(1);
    expect(rows[0].firstName).toBe('Marc');
  });

  it('normalise l’adresse avant de dédoublonner', async () => {
    await recordPreorder({ email: 'Alixe@Example.be', firstName: 'Alixe' });
    await recordPreorder({ email: ' alixe@example.be ', firstName: 'Alixe' });

    const rows = await listPreordersSince(Date.now() - 7 * DAY);

    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('alixe@example.be');
  });

  it('exclut ce qui précède la fenêtre', async () => {
    store.zset.set('ancien@example.be', Date.now() - 30 * DAY);
    store.hash.set('ancien@example.be', 'Ancien');
    await recordPreorder({ email: 'recent@example.be', firstName: 'Recent' });

    const rows = await listPreordersSince(Date.now() - 7 * DAY);

    expect(rows.map((r) => r.email)).toEqual(['recent@example.be']);
  });

  it('survit à un prénom manquant dans le hash', async () => {
    store.zset.set('sansnom@example.be', Date.now());

    const rows = await listPreordersSince(Date.now() - 7 * DAY);

    expect(rows).toHaveLength(1);
    expect(rows[0].firstName).toBe('');
  });
});
