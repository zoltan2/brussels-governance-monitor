// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Confirmation d'inscription : réabonnement d'une personne désabonnée
 * (registre RGPD, décision du 29/09/2026). Si l'empreinte de l'adresse figure
 * au registre, le contact reçoit la source `retour` et la ligne est effacée.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.RESEND_API_KEY = 'test-key';
process.env.AUTH_SECRET = 'secret-auth';

const getContact = vi.fn();
const addContact = vi.fn();
const updateContactPreferences = vi.fn();
const send = vi.fn();
vi.mock('@/lib/resend', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/resend')>()),
  getContact: (...a: unknown[]) => getContact(...a),
  addContact: (...a: unknown[]) => addContact(...a),
  updateContactPreferences: (...a: unknown[]) => updateContactPreferences(...a),
  getResend: () => ({ emails: { send } }),
  resendCall: (fn: () => unknown) => fn(),
}));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => ({ allowed: true, remaining: 9 }) }));

const { POST } = await import('./route');
const { generateConfirmToken } = await import('@/lib/token');
const { getDb } = await import('@/lib/db');
const { fingerprintEmail, noterDesabonnement, lireDesabonnement } = await import(
  '@/lib/desabonnements'
);

const db = getDb()!;
const EMAIL = 'revenant@example.org';

function requete(email = EMAIL): Request {
  const token = generateConfirmToken({ email, locale: 'fr', topics: ['budget'], source: 'website' });
  return new Request('https://governance.brussels/api/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

beforeEach(() => {
  db.exec('DELETE FROM desabonnements');
  getContact.mockReset().mockResolvedValue(null);
  addContact.mockReset().mockResolvedValue(undefined);
  updateContactPreferences.mockReset().mockResolvedValue(undefined);
  send.mockReset().mockResolvedValue({ data: { id: 'e1' }, error: null });
});

describe('POST /api/confirm : réabonnement', () => {
  it('ajoute la source « retour » et efface la ligne du registre', async () => {
    noterDesabonnement(db, fingerprintEmail(EMAIL), Date.now() - 40 * 86_400_000);
    const res = await POST(requete());

    expect(res.status).toBe(200);
    expect(addContact).toHaveBeenCalledWith(EMAIL, 'fr', ['budget'], ['website', 'retour']);
    expect(lireDesabonnement(db, fingerprintEmail(EMAIL))).toBeNull();
  });

  it('reconnaît le retour quelle que soit la casse de l’adresse', async () => {
    noterDesabonnement(db, fingerprintEmail(EMAIL), 1000);
    await POST(requete('Revenant@Example.ORG'));
    expect(addContact.mock.calls[0][3]).toContain('retour');
  });

  it('une première inscription ne reçoit pas « retour »', async () => {
    await POST(requete());
    expect(addContact).toHaveBeenCalledWith(EMAIL, 'fr', ['budget'], ['website']);
  });

  it('garde la ligne si le contact n’a pas pu être enregistré', async () => {
    noterDesabonnement(db, fingerprintEmail(EMAIL), 1000);
    addContact.mockRejectedValue(new Error('refus Resend'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await POST(requete());
    expect(lireDesabonnement(db, fingerprintEmail(EMAIL))).not.toBeNull();
  });

  it('contact déjà actif : fusionne « retour » dans ses sources et efface la ligne', async () => {
    noterDesabonnement(db, fingerprintEmail(EMAIL), 1000);
    getContact.mockResolvedValue({ locale: 'nl', topics: ['budget'], sources: ['chat'] });
    await POST(requete());

    expect(updateContactPreferences).toHaveBeenCalledWith(EMAIL, 'nl', ['budget'], [
      'chat',
      'website',
      'retour',
    ]);
    expect(lireDesabonnement(db, fingerprintEmail(EMAIL))).toBeNull();
  });
});
