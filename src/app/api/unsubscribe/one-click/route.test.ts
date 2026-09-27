// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Désabonnement en un clic (RFC 8058), relevé le 25/09/2026.
 *
 * Le digest annonçait `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, mais
 * `List-Unsubscribe` pointait vers la PAGE de préférences : un POST de Gmail y
 * rendait 200 sans rien désabonner. Le lecteur recevait le digest suivant et
 * n'avait plus que le bouton « Spam ». Cette route est la cible de l'en-tête.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const update = vi.fn();
const send = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    contacts = { update };
    emails = { send };
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ allowed: true, remaining: 59 }),
}));

// Espion à l'entrée de removeContact : l'appel à Resend, lui, n'arrive
// qu'après le délai de throttle(). Un GET qui lancerait le désabonnement sans
// l'attendre passerait donc inaperçu si l'on n'observait que `update`.
const removeContactSpy = vi.fn();
vi.mock('@/lib/resend', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/resend')>();
  return {
    ...orig,
    removeContact: (email: string) => {
      removeContactSpy(email);
      return orig.removeContact(email);
    },
  };
});

process.env.RESEND_API_KEY = 'test-key';
process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'secret-de-test';
process.env.NEXT_PUBLIC_SITE_URL = 'https://governance.brussels';

const { POST, GET } = await import('./route');
const { generateUnsubscribeToken } = await import('@/lib/token');

const CORPS_RFC = 'List-Unsubscribe=One-Click';

function requete(token: string | null, corps: string = CORPS_RFC, method = 'POST') {
  const url = new URL('https://governance.brussels/api/unsubscribe/one-click');
  if (token !== null) url.searchParams.set('token', token);
  url.searchParams.set('locale', 'nl');
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: method === 'POST' ? corps : undefined,
  });
}

beforeEach(() => {
  update.mockReset();
  send.mockReset();
  removeContactSpy.mockReset();
  update.mockResolvedValue({ data: { id: 'c1' }, error: null });
});

describe('POST /api/unsubscribe/one-click', () => {
  it('désabonne le contact du jeton et répond 200', async () => {
    const res = await POST(requete(generateUnsubscribeToken('lecteur@example.org')));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ email: 'lecteur@example.org', unsubscribed: true });
  });

  it("n'envoie aucun email : ni au lecteur, ni à l'administrateur", async () => {
    await POST(requete(generateUnsubscribeToken('lecteur@example.org')));
    expect(send).not.toHaveBeenCalled();
  });

  it('refuse un jeton invalide sans toucher aux contacts', async () => {
    const res = await POST(requete('pas.un-jeton'));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('refuse une requête sans jeton', async () => {
    const res = await POST(requete(null));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('refuse un corps qui n’est pas celui de la RFC 8058', async () => {
    const res = await POST(requete(generateUnsubscribeToken('lecteur@example.org'), 'autre=chose'));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('répond 500 quand Resend refuse : un échec ne doit pas passer pour un succès', async () => {
    update.mockResolvedValue({ data: null, error: { statusCode: 422, message: 'refus' } });
    const res = await POST(requete(generateUnsubscribeToken('lecteur@example.org')));
    expect(res.status).toBe(500);
  });
});

describe('GET /api/unsubscribe/one-click', () => {
  it('ne désabonne jamais (les scanners de liens suivent les GET) et renvoie vers les préférences', async () => {
    const token = generateUnsubscribeToken('lecteur@example.org');
    const res = await GET(requete(token, CORPS_RFC, 'GET'));
    expect(removeContactSpy).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location.startsWith('https://governance.brussels/nl/subscribe/preferences?token=')).toBe(true);
  });
});
