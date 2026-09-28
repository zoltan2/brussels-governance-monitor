// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Revue red team du 28/09/2026 : `/api/subscribe` (formulaire de l'accueil) ne
 * plafonnait le corps que sur `Content-Length`. Un envoi en flux n'en porte pas,
 * et `request.json()` mettait alors tout en memoire.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ allowed: true, remaining: 4 }),
}));
const getContact = vi.fn();
vi.mock('@/lib/resend', () => ({
  getResend: vi.fn(),
  EMAIL_FROM: 'test@governance.brussels',
  getContact,
  estDesinscrit: vi.fn(),
  getTopics: () => ['mobility'],
  resendCall: vi.fn(),
}));

delete process.env.RESEND_API_KEY;

const { POST } = await import('./route');

function requeteEnFlux(texte: string): Request {
  const octets = new TextEncoder().encode(texte);
  const TAILLE = 16 * 1024;
  let pos = 0;
  const flux = new ReadableStream<Uint8Array>({
    pull(c) {
      if (pos >= octets.length) return c.close();
      c.enqueue(octets.slice(pos, pos + TAILLE));
      pos += TAILLE;
    },
  });
  return new Request('https://governance.brussels/api/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: flux,
    // @ts-expect-error `duplex` est exige par undici pour un corps en flux
    duplex: 'half',
  });
}

describe('POST /api/subscribe, taille du corps', () => {
  it('refuse en 413 un corps en flux, sans Content-Length, au-delà de 64 Kio', async () => {
    const req = requeteEnFlux(
      JSON.stringify({ email: 'a@b.be', locale: 'fr', topics: ['x'.repeat(1024 * 1024)] }),
    );
    expect(req.headers.get('content-length')).toBeNull();
    const res = await POST(req);
    expect(res.status).toBe(413);
    expect(getContact).not.toHaveBeenCalled();
  });

  it('lit normalement un petit corps en flux', async () => {
    const res = await POST(
      requeteEnFlux(
        JSON.stringify({ email: 'a@b.be', locale: 'fr', topics: ['mobility'], website: '' }),
      ),
    );
    // Corps lu et validé : la route va jusqu'au service d'envoi, absent ici.
    expect(res.status).toBe(503);
  });

  it('rend 400 et non 500 sur un JSON invalide', async () => {
    const res = await POST(requeteEnFlux('{pas du json'));
    expect(res.status).toBe(400);
  });
});
