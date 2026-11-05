// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.AUTH_SECRET = 'secret-auth';
const setMotMensuel = vi.fn();
const removeContact = vi.fn();
vi.mock('@/lib/resend', () => ({ setMotMensuel: (...a: unknown[]) => setMotMensuel(...a), removeContact }));
const noterChoixCoulisses = vi.fn();
vi.mock('@/lib/coulisses/refus', () => ({ noterChoixCoulisses: (...a: unknown[]) => noterChoixCoulisses(...a) }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => ({ allowed: true, remaining: 9 }) }));

const { POST, GET } = await import('./route');
const { generateUnsubscribeToken, generateConfirmToken } = await import('@/lib/token');

function post(token: string, corps = 'List-Unsubscribe=One-Click') {
  return new Request(`https://governance.brussels/api/coulisses/one-click?token=${encodeURIComponent(token)}&locale=nl`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: corps,
  });
}

beforeEach(() => {
  setMotMensuel.mockReset().mockResolvedValue(undefined);
  removeContact.mockReset();
  noterChoixCoulisses.mockReset();
});

describe('/api/coulisses/one-click', () => {
  it('POST RFC 8058 : refuse les coulisses seules, ne retire jamais le contact', async () => {
    const res = await POST(post(generateUnsubscribeToken('a@example.org')));
    expect(res.status).toBe(200);
    expect(setMotMensuel).toHaveBeenCalledWith('a@example.org', false);
    expect(removeContact).not.toHaveBeenCalled();
    expect(noterChoixCoulisses).toHaveBeenCalledWith('a@example.org', false, 'one-click');
  });

  it('ne date rien si Resend échoue', async () => {
    setMotMensuel.mockRejectedValueOnce(new Error('Resend'));
    const res = await POST(post(generateUnsubscribeToken('a@example.org')));
    expect(res.status).toBe(500);
    expect(noterChoixCoulisses).not.toHaveBeenCalled();
  });

  it('POST multipart/form-data (forme recommandée par la RFC 8058) : accepté', async () => {
    const form = new FormData();
    form.set('List-Unsubscribe', 'One-Click');
    const res = await POST(
      new Request(`https://governance.brussels/api/coulisses/one-click?token=${encodeURIComponent(generateUnsubscribeToken('a@example.org'))}`, { method: 'POST', body: form }),
    );
    expect(res.status).toBe(200);
    expect(setMotMensuel).toHaveBeenCalledWith('a@example.org', false);
  });

  it('refuse un multipart sans le bon champ, et un champ à une autre valeur', async () => {
    const t = encodeURIComponent(generateUnsubscribeToken('a@example.org'));
    const f1 = new FormData();
    f1.set('autre', 'One-Click');
    const f2 = new FormData();
    f2.set('List-Unsubscribe', 'Oui');
    for (const f of [f1, f2]) {
      expect((await POST(new Request(`https://governance.brussels/api/coulisses/one-click?token=${t}`, { method: 'POST', body: f }))).status).toBe(400);
    }
    expect(setMotMensuel).not.toHaveBeenCalled();
  });

  it('refuse un corps autre que celui de la RFC', async () => {
    const res = await POST(post(generateUnsubscribeToken('a@example.org'), 'autre'));
    expect(res.status).toBe(400);
    expect(setMotMensuel).not.toHaveBeenCalled();
  });

  it("refuse un jeton d'une autre famille", async () => {
    const t = generateConfirmToken({ email: 'a@example.org', locale: 'fr', topics: [] });
    expect((await POST(post(t))).status).toBe(400);
    expect(setMotMensuel).not.toHaveBeenCalled();
  });

  it('GET ne refuse rien et mène à la case des préférences', async () => {
    const res = GET(new Request('https://governance.brussels/api/coulisses/one-click?token=x&locale=nl'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch(/\/nl\/subscribe\/preferences\?token=x#coulisses$/);
    expect(setMotMensuel).not.toHaveBeenCalled();
    expect(noterChoixCoulisses).not.toHaveBeenCalled();
  });
});
