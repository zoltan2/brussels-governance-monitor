// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Retour de paiement : lien à usage unique, refus d'une session remboursée
 * (revue red team du 29/09/2026).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.AUTH_SECRET = 'secret-auth';
process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.NEXT_PUBLIC_SITE_URL = 'https://governance.brussels';

const retrieve = vi.fn();
vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { retrieve } };
  },
}));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => ({ allowed: true, remaining: 9 }) }));

const { GET } = await import('./route');
const { CHAT_ACCESS_COOKIE, mintChatAccess } = await import('@/lib/chat-access');

let n = 0;
const nouvelleSession = () => `cs_test_session_${++n}_abcdefgh`;

function requete(id: string, cookie?: string): Request {
  return new Request(`https://governance.brussels/api/chat/unlock?session_id=${id}`, {
    headers: cookie ? { cookie } : {},
  });
}
const payee = (refunded = false) => ({
  payment_status: 'paid',
  payment_intent: { latest_charge: { refunded, amount_refunded: refunded ? 500 : 0 } },
});

beforeEach(() => retrieve.mockReset());

describe('GET /api/chat/unlock', () => {
  it('ouvre une fois, puis refuse le même lien dans un autre navigateur', async () => {
    const id = nouvelleSession();
    retrieve.mockResolvedValue(payee());
    const r1 = await GET(requete(id));
    expect(r1.headers.get('location')).toContain('chat_unlocked=1');
    expect(r1.headers.get('set-cookie')).toContain(CHAT_ACCESS_COOKIE);

    const r2 = await GET(requete(id));
    expect(r2.headers.get('location')).toContain('chat_unlocked=0');
    expect(r2.headers.get('set-cookie')).toBeNull();
  });

  it('le navigateur qui porte déjà cet accès peut recharger la page de retour', async () => {
    const id = nouvelleSession();
    retrieve.mockResolvedValue(payee());
    await GET(requete(id));
    const { value } = mintChatAccess(id);
    const r = await GET(requete(id, `${CHAT_ACCESS_COOKIE}=${value}`));
    expect(r.headers.get('location')).toContain('chat_unlocked=1');
  });

  it("n'ouvre rien pour une session remboursée", async () => {
    retrieve.mockResolvedValue(payee(true));
    const r = await GET(requete(nouvelleSession()));
    expect(r.headers.get('location')).toContain('chat_unlocked=0');
    expect(retrieve.mock.calls[0][1]).toEqual({ expand: ['payment_intent.latest_charge'] });
  });
});
