// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createDb } from '@/lib/db';
import { ajouterEntretien } from '@/lib/sondage/store';

// Le garde du layout admin ne couvre pas les routes API : chaque route doit
// refuser seule. `auth(handler)` est remplacé par un enveloppeur qui injecte la
// session voulue, comme le fait next-auth.
const session = vi.hoisted(() => ({ valeur: null as null | { user: { email: string } } }));
vi.mock('@/auth', () => ({
  auth:
    (handler: (req: NextRequest & { auth: unknown }) => unknown) =>
    (req: NextRequest) =>
      handler(Object.assign(req, { auth: session.valeur })),
}));

const base = vi.hoisted(() => ({ db: null as ReturnType<typeof createDb> | null }));
vi.mock('@/lib/db', async (orig) => ({
  ...(await orig<typeof import('@/lib/db')>()),
  getDb: () => base.db,
}));

const { POST: exportReponses } = await import('./export-reponses/route');
const { POST: exportEntretiens } = await import('./export-entretiens/route');
const { POST: purge } = await import('./purge/route');

type Handler = (req: NextRequest) => Promise<Response>;

function requete(chemin: string, corps?: string): NextRequest {
  return new NextRequest(`http://localhost${chemin}`, {
    method: 'POST',
    headers: {
      host: 'localhost',
      origin: 'http://localhost',
      'sec-fetch-site': 'same-origin',
      ...(corps ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: corps,
  });
}

const ROUTES: [string, Handler, string, string?][] = [
  ['export-reponses', exportReponses as unknown as Handler, '/api/admin/sondage/export-reponses'],
  ['export-entretiens', exportEntretiens as unknown as Handler, '/api/admin/sondage/export-entretiens'],
  ['purge', purge as unknown as Handler, '/api/admin/sondage/purge', 'confirmation=PURGER'],
];

beforeEach(() => {
  base.db = createDb(':memory:');
  ajouterEntretien(base.db, { email: 'volontaire@example.org', langue: 'fr', jour: '2026-11-20' });
  ajouterEntretien(base.db, { telephone: '0470 99 88 77', langue: 'nl', jour: '2026-11-21' });
  session.valeur = null;
});

describe('routes admin du sondage', () => {
  it.each(ROUTES)('%s : refusée sans session, sans rien lire ni effacer', async (_, handler, chemin, corps) => {
    const res = await handler(requete(chemin, corps));
    expect(res.status).toBe(401);
    const texte = await res.text();
    expect(texte).not.toContain('volontaire@example.org');
    expect(texte).not.toContain('0470 99 88 77');
    expect(base.db!.prepare('SELECT COUNT(*) AS n FROM sondage_entretiens').get()).toEqual({ n: 2 });
  });

  it.each(ROUTES)('%s : refusée depuis une autre origine, même avec une session', async (_, handler, chemin, corps) => {
    session.valeur = { user: { email: 'admin@example.org' } };
    const req = requete(chemin, corps);
    req.headers.set('sec-fetch-site', 'same-site');
    req.headers.set('origin', 'https://analytics.governance.brussels');
    expect((await handler(req)).status).toBe(403);
  });

  it('avec une session, l’export des entretiens rend le CSV', async () => {
    session.valeur = { user: { email: 'admin@example.org' } };
    const res = await (exportEntretiens as unknown as Handler)(requete('/api/admin/sondage/export-entretiens'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    const csv = await res.text();
    expect(csv).toContain('volontaire@example.org');
    expect(csv).toContain('"","0470 99 88 77","nl","2026-11-21"');
  });

  it('la purge exige la confirmation tapée', async () => {
    session.valeur = { user: { email: 'admin@example.org' } };
    const sans = await (purge as unknown as Handler)(requete('/api/admin/sondage/purge', 'confirmation=oui'));
    expect(sans.status).toBe(400);
    expect(base.db!.prepare('SELECT COUNT(*) AS n FROM sondage_entretiens').get()).toEqual({ n: 2 });
    const avec = await (purge as unknown as Handler)(requete('/api/admin/sondage/purge', 'confirmation=PURGER'));
    expect(avec.status).toBe(303);
    expect(avec.headers.get('location')).toContain('/fr/admin/sondage?entretiens=2');
    expect(base.db!.prepare('SELECT COUNT(*) AS n FROM sondage_entretiens').get()).toEqual({ n: 0 });
  });
});
