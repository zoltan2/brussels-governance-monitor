// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Relais des événements Umami (revue red team du 28/09/2026) : il ne doit
 * transmettre à Umami ni les cookies du site (session d'administration), ni
 * aucun en-tête superflu, et ne rien recopier de la réponse hormis le corps.
 *
 * La RÉCEPTION réelle ne se constate qu'en production (`data-domains` bloque
 * l'envoi depuis localhost, et Caddy y sert `/u/*` directement).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { POST } from './route';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

const EVENEMENT = JSON.stringify({
  type: 'event',
  payload: { website: 'e42598c7', url: '/fr', hostname: 'governance.brussels' },
});

function requete(corps: BodyInit, entetes: Record<string, string> = {}): Request {
  return new Request('https://governance.brussels/u/api/send', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 test',
      'x-forwarded-for': '203.0.113.9, 198.51.100.7',
      cookie: 'authjs.session-token=SECRET; bgm_chat_tier=paid.sig',
      authorization: 'Bearer SECRET',
      'x-umami-cache': 'jeton-cache',
      ...entetes,
    },
    body: corps,
  });
}

describe('POST /u/api/send', () => {
  it("relaie le corps, l'agent et l'adresse, jamais les cookies", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"cache":"x","disabled":false}', {
        status: 200,
        headers: { 'content-type': 'application/json', 'set-cookie': 'umami=1' },
      }),
    );

    const res = await POST(requete(EVENEMENT));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://analytics.governance.brussels/api/send');
    expect(init.body).toBe(EVENEMENT);
    const envoyes = new Headers(init.headers);
    expect([...envoyes.keys()].sort()).toEqual([
      'content-type',
      'user-agent',
      'x-forwarded-for',
      'x-umami-cache',
    ]);
    expect(envoyes.get('x-forwarded-for')).toBe('198.51.100.7');
    expect(envoyes.get('user-agent')).toBe('Mozilla/5.0 test');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cache: 'x', disabled: false });
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it("refuse un corps trop gros sans appeler Umami", async () => {
    const res = await POST(requete('x'.repeat(20 * 1024)));
    expect(res.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rend 502 si Umami est injoignable', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await POST(requete(EVENEMENT));
    expect(res.status).toBe(502);
  });
});
