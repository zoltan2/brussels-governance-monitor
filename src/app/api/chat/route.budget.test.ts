// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Plafond de dépense quotidien (2 USD par défaut, décision du 29/09/2026) et
 * révocation d'un accès payant remboursé.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.NEXT_PUBLIC_CHATBOT_ENABLED = 'true';
process.env.CHAT_SESSION_SECRET = 'secret-de-test';
process.env.ANTHROPIC_API_KEY = 'cle-de-test';
process.env.AUTH_SECRET = 'secret-auth';
process.env.STRIPE_SECRET_KEY = 'sk_test';

const stream = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { stream }; } }));
const retrieve = vi.fn();
vi.mock('stripe', () => ({ default: class { checkout = { sessions: { retrieve } }; } }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => ({ allowed: true, remaining: 9 }) }));
vi.mock('@/lib/chat-logs', () => ({ pushLog: vi.fn() }));
const buildSystemPrompt = vi.fn((tier: string) => ({ system: `systeme-${tier}`, dossierCount: 0 }));
vi.mock('@/lib/chat-system-prompt', () => ({ buildSystemPrompt: (t: string) => buildSystemPrompt(t) }));

const { POST } = await import('./route');
const { getDb } = await import('@/lib/db');
const { ajouterDepense, depenseDuJour, jourBruxelles } = await import('@/lib/chat-budget');
const { CHAT_ACCESS_COOKIE, mintChatAccess } = await import('@/lib/chat-access');
const db = getDb()!;

function requete(cookie?: string): Request {
  return new Request('https://governance.brussels/api/chat', {
    method: 'POST',
    headers: {
      host: 'governance.brussels',
      origin: 'https://governance.brussels',
      'sec-fetch-site': 'same-origin',
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'Question' }], locale: 'fr' }),
  });
}
function reponse() {
  stream.mockReturnValue({
    async *[Symbol.asyncIterator]() {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'ok' } };
    },
    finalMessage: async () => ({ usage: { input_tokens: 40, cache_read_input_tokens: 9000, output_tokens: 300 } }),
  });
}

beforeEach(() => {
  db.exec('DELETE FROM chat_budget; DELETE FROM chat_paiements;');
  stream.mockReset();
  retrieve.mockReset();
  buildSystemPrompt.mockClear();
});

describe('POST /api/chat, plafond de dépense', () => {
  it('compte le coût de chaque réponse au jour de Bruxelles', async () => {
    reponse();
    const res = await POST(requete());
    expect(await res.text()).toBe('ok');
    expect(depenseDuJour(db, jourBruxelles())).toBe(7_320);
  });

  it('plafond atteint : 503, et aucun appel au modèle', async () => {
    ajouterDepense(db, jourBruxelles(), 2_000_000);
    reponse();
    const res = await POST(requete());
    expect(res.status).toBe(503);
    expect(stream).not.toHaveBeenCalled();
  });
});

describe('POST /api/chat, accès payant remboursé', () => {
  const cookie = (ref: string) => `${CHAT_ACCESS_COOKIE}=${mintChatAccess(ref).value}`;

  it('révoque un accès dont le paiement a été remboursé', async () => {
    retrieve.mockResolvedValue({ payment_intent: { latest_charge: { refunded: true } } });
    reponse();
    await POST(requete(cookie('cs_rembourse_12345678')));
    expect(buildSystemPrompt).toHaveBeenCalledWith('free');
  });

  it('garde un accès payé, sans revérifier Stripe avant 24 h', async () => {
    retrieve.mockResolvedValue({ payment_intent: { latest_charge: { refunded: false } } });
    reponse();
    await POST(requete(cookie('cs_paye_1234567890')));
    reponse();
    await POST(requete(cookie('cs_paye_1234567890')));
    expect(buildSystemPrompt).toHaveBeenLastCalledWith('paid');
    expect(retrieve).toHaveBeenCalledTimes(1);
  });
});
