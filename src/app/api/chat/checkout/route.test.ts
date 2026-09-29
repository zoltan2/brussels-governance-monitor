// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Paiement : renonciation expresse au droit de rétractation exigée, retour dans
 * la langue du visiteur (revue white du 29/09/2026).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.STRIPE_PRICE_ID = 'price_test';
process.env.NEXT_PUBLIC_SITE_URL = 'https://governance.brussels';

const create = vi.fn();
vi.mock('stripe', () => ({ default: class { checkout = { sessions: { create } }; } }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => ({ allowed: true, remaining: 4 }) }));

const { POST, languePaiement } = await import('./route');

const requete = (corps?: unknown) =>
  new Request('https://governance.brussels/api/chat/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });

beforeEach(() => create.mockReset().mockResolvedValue({ url: 'https://checkout.stripe.com/x' }));

describe('POST /api/chat/checkout', () => {
  it('refuse sans renonciation expresse, sans créer de session', async () => {
    for (const corps of [undefined, {}, { renonciation: 'oui' }, { locale: 'nl' }]) {
      const res = await POST(requete(corps));
      expect(res.status).toBe(400);
    }
    expect(create).not.toHaveBeenCalled();
  });

  it('avec renonciation : langue du visiteur et trace dans Stripe', async () => {
    const res = await POST(requete({ locale: 'nl', renonciation: true }));
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/x' });
    const p = create.mock.calls[0][0];
    expect(p.locale).toBe('nl');
    expect(p.cancel_url).toBe('https://governance.brussels/nl');
    expect(p.success_url).toContain('&l=nl');
    expect(p.metadata.renonciation_retractation).toBe('oui');
  });

  it('langue inconnue : français', () => {
    expect(languePaiement('xx')).toBe('fr');
    expect(languePaiement(undefined)).toBe('fr');
  });
});
