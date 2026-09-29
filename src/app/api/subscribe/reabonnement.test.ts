// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Réabonnement d'une personne désinscrite (29/09/2026). Elle reçoit l'email de
 * confirmation, au plus un par adresse et par 24 heures ; la réponse est
 * identique dans tous les cas. Limiteur réel, Resend simulé.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.RESEND_API_KEY = 'test-key';
process.env.AUTH_SECRET = 'secret-auth';

const getContact = vi.fn();
const estDesinscrit = vi.fn();
const send = vi.fn();
vi.mock('@/lib/resend', () => ({
  getResend: () => ({ emails: { send } }),
  EMAIL_FROM: 'test@governance.brussels',
  getContact: (...a: unknown[]) => getContact(...a),
  estDesinscrit: (...a: unknown[]) => estDesinscrit(...a),
  getTopics: () => ['mobility'],
  resendCall: (fn: () => unknown) => fn(),
}));
vi.mock('@/emails/confirm', () => ({ default: () => null }));

const { POST } = await import('./route');

let ip = 0;
function requete(email: string): Request {
  // Une IP par requête : seul le plafond par adresse doit jouer ici.
  ip++;
  return new Request('https://governance.brussels/api/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `203.0.113.${ip}` },
    body: JSON.stringify({ email, locale: 'fr', topics: ['mobility'] }),
  });
}

beforeEach(() => {
  getContact.mockReset().mockResolvedValue(null);
  estDesinscrit.mockReset().mockResolvedValue(false);
  send.mockReset().mockResolvedValue({ data: { id: 'e1' }, error: null });
});

describe('POST /api/subscribe : personne désinscrite', () => {
  it('reçoit un email de confirmation', async () => {
    estDesinscrit.mockResolvedValue(true);
    const res = await POST(requete('revient-1@example.org'));
    expect(await res.json()).toEqual({ success: true, requiresConfirmation: true });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].to).toBe('revient-1@example.org');
  });

  it('au plus un email par adresse et par 24 heures, même réponse ensuite', async () => {
    estDesinscrit.mockResolvedValue(true);
    await POST(requete('revient-2@example.org'));
    const res = await POST(requete('Revient-2@Example.org'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, requiresConfirmation: true });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('le plafond ne touche pas une adresse jamais désinscrite', async () => {
    await POST(requete('nouveau@example.org'));
    await POST(requete('nouveau@example.org'));
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('un contact actif ne reçoit toujours rien', async () => {
    getContact.mockResolvedValue({ locale: 'fr', topics: ['mobility'], sources: [] });
    const res = await POST(requete('actif@example.org'));
    expect(await res.json()).toEqual({ success: true, requiresConfirmation: true });
    expect(send).not.toHaveBeenCalled();
  });
});
