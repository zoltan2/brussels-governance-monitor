// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Aucune adresse en clair dans les erreurs levées par les appels de contact :
 * la route one-click les écrit dans ses journaux (revue du 29/09/2026). Et
 * réabonnement d'un désinscrit par `reactiverContact`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const create = vi.fn();
const update = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    contacts = { create, update };
  },
}));
vi.mock('@/lib/desabonnements', () => ({ enregistrerDesabonnement: vi.fn() }));

process.env.RESEND_API_KEY = 'test-key';
process.env.AUTH_SECRET = 'secret-auth';

const { addContact, removeContact, updateContactPreferences, reactiverContact } = await import(
  './resend'
);
const { pseudonymeEmail } = await import('./log-safe');

const EMAIL = 'lecteur@example.org';
// Resend cite parfois l'adresse dans son propre message.
const refus = { data: null, error: { name: 'validation_error', statusCode: 422, message: `Contact ${EMAIL} already exists` } };

beforeEach(() => {
  create.mockReset().mockResolvedValue(refus);
  update.mockReset().mockResolvedValue(refus);
});

async function messageDErreur(appel: () => Promise<unknown>): Promise<string> {
  try {
    await appel();
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("l'appel n'a pas levé");
}

describe('erreurs Resend sans adresse en clair', () => {
  it.each([
    ['addContact', () => addContact(EMAIL, 'fr', ['budget'])],
    ['removeContact', () => removeContact(EMAIL)],
    ['updateContactPreferences', () => updateContactPreferences(EMAIL, 'fr', ['budget'])],
    ['reactiverContact', () => reactiverContact(EMAIL, 'fr', ['budget'])],
  ])('%s : pseudonyme au lieu de l’adresse, y compris dans le message de Resend', async (_n, appel) => {
    const m = await messageDErreur(appel);
    expect(m).not.toContain('lecteur');
    expect(m).toContain(pseudonymeEmail(EMAIL));
    expect(m).toContain('[adresse]');
    expect(m).toContain('422');
  });
});

describe('reactiverContact', () => {
  it('lève unsubscribed et réécrit les préférences sur le contact existant', async () => {
    update.mockResolvedValue({ data: { id: 'c1' }, error: null });
    await reactiverContact(EMAIL, 'nl', ['budget', 'mobility'], ['website', 'retour', 'Retour']);
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      email: EMAIL,
      unsubscribed: false,
      properties: { locale: 'nl', topics: 'budget,mobility', sources: 'website,retour' },
    });
  });
});
