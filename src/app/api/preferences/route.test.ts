// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Préférences de l'abonné : enregistrer sans thème (aucun thème = tout
 * recevoir) et le choix « Les coulisses de BGM », stocké dans la propriété
 * Resend `mot_mensuel` (déclarée chez Resend le 3 novembre 2026).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ allowed: true, remaining: 4 }),
}));
vi.mock('@/lib/token', () => ({
  verifyUnsubscribeToken: (t: string) => (t === 'bon' ? { email: 'a@b.be' } : null),
  generateUnsubscribeToken: () => 'jeton',
}));
const getContact = vi.fn();
const updateContactPreferences = vi.fn();
vi.mock('@/lib/resend', () => ({
  getResend: () => ({ emails: { send: vi.fn() } }),
  EMAIL_FROM: 'test@governance.brussels',
  getContact,
  updateContactPreferences,
  getTopics: () => ['mobility', 'budget'],
  resendCall: async (f: () => unknown) => f(),
}));
vi.mock('@/emails/preferences-updated', () => ({ default: () => null }));

process.env.RESEND_API_KEY = 'test';

const { GET, POST } = await import('./route');

function post(body: unknown): Request {
  return new Request('https://governance.brussels/api/preferences', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getContact.mockReset();
  updateContactPreferences.mockReset();
});

describe('GET /api/preferences', () => {
  it('renvoie le choix des coulisses', async () => {
    getContact.mockResolvedValue({ locale: 'nl', topics: ['budget'], sources: [], motMensuel: false });
    const res = await GET(new Request('https://governance.brussels/api/preferences?token=bon'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: 'a@b.be', locale: 'nl', topics: ['budget'], motMensuel: false });
  });
});

describe('POST /api/preferences', () => {
  it('enregistre sans aucun thème', async () => {
    const res = await POST(post({ token: 'bon', topics: [], locale: 'fr', motMensuel: true }));
    expect(res.status).toBe(200);
    expect(updateContactPreferences).toHaveBeenCalledWith('a@b.be', 'fr', [], undefined, true);
  });

  it('enregistre le refus des coulisses', async () => {
    const res = await POST(post({ token: 'bon', topics: ['budget'], locale: 'en', motMensuel: false }));
    expect(res.status).toBe(200);
    expect(updateContactPreferences).toHaveBeenCalledWith('a@b.be', 'en', ['budget'], undefined, false);
  });

  it("laisse le choix des coulisses intact quand il n'est pas envoyé", async () => {
    await POST(post({ token: 'bon', topics: ['budget'], locale: 'fr' }));
    expect(updateContactPreferences).toHaveBeenCalledWith('a@b.be', 'fr', ['budget'], undefined, undefined);
  });

  it('refuse des thèmes qui ne sont pas une liste', async () => {
    const res = await POST(post({ token: 'bon', topics: 'budget', locale: 'fr' }));
    expect(res.status).toBe(400);
    expect(updateContactPreferences).not.toHaveBeenCalled();
  });

  it('refuse une liste de thèmes tous inconnus', async () => {
    const res = await POST(post({ token: 'bon', topics: ['inconnu'], locale: 'fr' }));
    expect(res.status).toBe(400);
    expect(updateContactPreferences).not.toHaveBeenCalled();
  });

  it('refuse un choix des coulisses qui ne soit pas un booléen', async () => {
    const res = await POST(post({ token: 'bon', topics: [], locale: 'fr', motMensuel: 'non' }));
    expect(res.status).toBe(400);
    expect(updateContactPreferences).not.toHaveBeenCalled();
  });
});
