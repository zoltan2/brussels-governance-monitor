// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Contrôle quotidien de l'inscription. Il ne testait que la création du
 * contact : un envoi d'email cassé (clé, domaine expéditeur, gabarit qui ne se
 * rend plus) passait inaperçu, alors que toute inscription commence par cet
 * email. Depuis le 02/10/2026, il envoie aussi le VRAI email de confirmation à
 * l'adresse de test de Resend, qui n'atteint aucune boîte réelle.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.CRON_SECRET = 'secret-cron';
process.env.RESEND_API_KEY = 'cle-de-test';

const addContact = vi.fn();
const send = vi.fn();
const remove = vi.fn();
vi.mock('@/lib/resend', () => ({
  getResend: () => ({ emails: { send }, contacts: { remove } }),
  EMAIL_FROM: 'BGM <noreply@mail.example.org>',
  addContact: (...a: unknown[]) => addContact(...a),
  resendCall: (fn: () => unknown) => fn(),
}));
vi.mock('@/emails/confirm', () => ({ default: (p: unknown) => ({ confirm: p }) }));

const { GET } = await import('./route');

const requete = (jeton = 'secret-cron') =>
  new Request('https://governance.brussels/api/cron/contacts-healthcheck', {
    headers: { authorization: `Bearer ${jeton}` },
  });

beforeEach(() => {
  addContact.mockReset().mockResolvedValue(undefined);
  send.mockReset().mockResolvedValue({ data: { id: 'e1' }, error: null });
  remove.mockReset().mockResolvedValue({ data: {}, error: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('GET /api/cron/contacts-healthcheck', () => {
  it('sans le secret : 401, rien n’est créé ni envoyé', async () => {
    const res = await GET(requete('faux'));
    expect(res.status).toBe(401);
    expect(addContact).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('tout va bien : contact créé puis retiré, et email de confirmation envoyé à l’adresse de test', async () => {
    const res = await GET(requete());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, contact: 'ok', envoi: 'ok' });
    expect(addContact).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
    const envoi = send.mock.calls[0][0];
    expect(envoi.to).toBe('delivered@resend.dev');
    expect(envoi.from).toBe('BGM <noreply@mail.example.org>');
    // Le vrai gabarit de l'inscription, pas un texte de circonstance.
    expect(envoi.react.confirm).toMatchObject({ locale: 'fr' });
    expect(envoi.tags).toContainEqual({ name: 'type', value: 'healthcheck' });
  });

  it('jamais d’envoi vers une adresse réelle', async () => {
    await GET(requete());
    for (const [appel] of send.mock.calls) expect(appel.to).toMatch(/@resend\.dev$/);
  });

  it('Resend refuse l’envoi : 500 et ligne [contacts-healthcheck-FAIL]', async () => {
    send.mockResolvedValue({ data: null, error: { name: 'validation_error', message: 'domaine non vérifié' } });
    const res = await GET(requete());
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ ok: false, contact: 'ok', envoi: 'echec' });
    expect(vi.mocked(console.error).mock.calls.flat().join(' ')).toContain('[contacts-healthcheck-FAIL]');
  });

  it('l’envoi lève une exception : 500, pas une page d’erreur muette', async () => {
    send.mockRejectedValue(new Error('réseau'));
    const res = await GET(requete());
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ ok: false, envoi: 'echec' });
  });

  it('la création du contact échoue : 500, et l’envoi est quand même essayé', async () => {
    addContact.mockRejectedValue(new Error('propriété inconnue'));
    const res = await GET(requete());
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ ok: false, contact: 'echec', envoi: 'ok' });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('le nettoyage du contact échoue : le contrôle reste vert', async () => {
    remove.mockRejectedValue(new Error('introuvable'));
    const res = await GET(requete());
    expect(res.status).toBe(200);
  });
});
