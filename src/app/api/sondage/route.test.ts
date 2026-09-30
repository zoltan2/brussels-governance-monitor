// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDb } from '@/lib/db';

const base = vi.hoisted(() => ({ db: null as ReturnType<typeof createDb> | null, cookie: undefined as string | undefined }));
vi.mock('@/lib/db', async (orig) => ({
  ...(await orig<typeof import('@/lib/db')>()),
  getDb: () => base.db,
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => (base.cookie ? { value: base.cookie } : undefined) }),
}));

const { POST } = await import('./route');

let ip = 0;
function requete(corps: unknown): Request {
  return new Request('http://localhost/api/sondage', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `192.0.2.${++ip}` },
    body: JSON.stringify(corps),
  });
}

beforeEach(() => {
  base.db = createDb(':memory:');
  base.cookie = undefined;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-16T09:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('POST /api/sondage', () => {
  it('pose un cookie de session HttpOnly, SameSite=Lax, sans durée, et interdit le cache', async () => {
    const res = await POST(requete({ etape: 'accueil', langue: 'nl' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/^bgm_sondage=[A-Za-z0-9_-]{22};/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).not.toMatch(/Max-Age|Expires/i);
    const ligne = base.db!.prepare('SELECT langue, pilote FROM sondage_reponses').get();
    expect(ligne).toEqual({ langue: 'nl', pilote: 0 });
  });

  it('SONDAGE_PILOTE=1 marque la réponse pilote', async () => {
    vi.stubEnv('SONDAGE_PILOTE', '1');
    await POST(requete({ etape: 'accueil', langue: 'fr' }));
    expect(base.db!.prepare('SELECT pilote FROM sondage_reponses').get()).toEqual({ pilote: 1 });
  });

  it('après la clôture configurée : 410, rien écrit', async () => {
    vi.stubEnv('SONDAGE_CLOTURE', '2026-11-15');
    const res = await POST(requete({ etape: 'accueil', langue: 'fr' }));
    expect(res.status).toBe(410);
    expect(await res.json()).toMatchObject({ erreur: 'sondage_clos' });
    expect(base.db!.prepare('SELECT COUNT(*) AS n FROM sondage_reponses').get()).toEqual({ n: 0 });
  });

  it('hors période, le refus vient avant la lecture du corps (410, pas 413)', async () => {
    vi.stubEnv('SONDAGE_OUVERTURE', '2026-11-20');
    const res = await POST(requete({ etape: 'q8', reponse: { texte: 'x'.repeat(40_000), citation: 'non' } }));
    expect(res.status).toBe(410);
    expect(await res.json()).toMatchObject({ erreur: 'sondage_pas_ouvert' });
  });

  it('un corps trop gros est refusé sans être lu en entier', async () => {
    const res = await POST(requete({ etape: 'q8', reponse: { texte: 'x'.repeat(40_000), citation: 'non' } }));
    expect(res.status).toBe(413);
  });
});
