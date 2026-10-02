// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Réabonnement d'une personne désinscrite (29/09/2026). Elle reçoit l'email de
 * confirmation, au plus un par adresse et par 24 heures ; la réponse est
 * identique dans tous les cas. Limiteur réel, Resend simulé.
 *
 * Adresse déjà abonnée (02/10/2026) : elle reçoit un email « déjà abonné » dont
 * le bouton porte le jeton des sujets demandés. Avant, rien ne partait alors
 * que l'écran disait « Vérifiez votre boîte mail ». Jeton réel, vérifié ici.
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
// Les deux emails se distinguent par la clé de l'objet rendu.
vi.mock('@/emails/confirm', () => ({ default: (p: unknown) => ({ confirm: p }) }));
vi.mock('@/emails/deja-abonne', () => ({ default: (p: unknown) => ({ dejaAbonne: p }) }));

const { POST } = await import('./route');
const { verifyConfirmToken } = await import('@/lib/token');

let ip = 0;
function requete(email: string, corps: Record<string, unknown> = {}): Request {
  // Une IP par requête : seul le plafond par adresse doit jouer ici.
  ip++;
  return new Request('https://governance.brussels/api/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `203.0.113.${ip}` },
    body: JSON.stringify({ email, locale: 'fr', topics: ['mobility'], ...corps }),
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
});

type Rendu = { confirmUrl: string; locale: string; topics?: string[] };
const rendu = (appel: number, cle: 'confirm' | 'dejaAbonne'): Rendu =>
  send.mock.calls[appel][0].react[cle];
const jetonDe = (appel: number, cle: 'confirm' | 'dejaAbonne') =>
  verifyConfirmToken(decodeURIComponent(rendu(appel, cle).confirmUrl.split('token=')[1]));

describe('POST /api/subscribe : adresse déjà abonnée', () => {
  const actif = { locale: 'nl', topics: ['budget'], sources: ['website'] };

  it('reçoit l’email « déjà abonné », avec un jeton portant les sujets demandés', async () => {
    getContact.mockResolvedValue(actif);
    const res = await POST(requete('actif-1@example.org'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, requiresConfirmation: true });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].to).toBe('actif-1@example.org');
    expect(rendu(0, 'dejaAbonne')).toBeDefined();
    expect(rendu(0, 'dejaAbonne').topics).toEqual(['mobility']);
    expect(jetonDe(0, 'dejaAbonne')).toMatchObject({
      email: 'actif-1@example.org',
      topics: ['mobility'],
    });
  });

  it('écrit dans la langue de l’abonné, pas dans celle de l’appelant', async () => {
    getContact.mockResolvedValue(actif);
    await POST(requete('actif-2@example.org'));
    expect(rendu(0, 'dejaAbonne').locale).toBe('nl');
    expect(rendu(0, 'dejaAbonne').confirmUrl).toContain('/nl/subscribe/confirm');
    expect(jetonDe(0, 'dejaAbonne')?.locale).toBe('nl');
  });

  it('au plus un email par adresse et par 24 heures, quelle que soit la casse', async () => {
    getContact.mockResolvedValue(actif);
    await POST(requete('actif-3@example.org'));
    const res = await POST(requete('Actif-3@Example.org'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, requiresConfirmation: true });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('l’email part même si les sujets demandés sont déjà suivis', async () => {
    getContact.mockResolvedValue({ ...actif, topics: ['mobility'] });
    await POST(requete('actif-4@example.org'));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('échec d’envoi : même réponse que pour une adresse inconnue', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'panne' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const inconnue = await POST(requete('inconnue-5@example.org'));
    getContact.mockResolvedValue(actif);
    const abonnee = await POST(requete('actif-5@example.org'));
    expect(inconnue.status).toBe(500);
    expect(abonnee.status).toBe(inconnue.status);
    expect(await abonnee.json()).toEqual(await inconnue.json());
  });
});

describe('POST /api/subscribe : sujets et origine', () => {
  it('dédoublonne les sujets', async () => {
    await POST(requete('doublon@example.org', { topics: ['mobility', 'mobility'] }));
    expect(jetonDe(0, 'confirm')?.topics).toEqual(['mobility']);
  });

  it.each([
    ['accueil', 'website-accueil'],
    ['page', 'website-page'],
    ['fiche-haut', 'website-fiche-haut'],
    ['fiche-bas', 'website-fiche-bas'],
  ])('origine %s : source %s', async (origine, source) => {
    await POST(requete(`origine-${origine}@example.org`, { origine }));
    expect(jetonDe(0, 'confirm')?.source).toBe(source);
  });

  it('sans origine : source website', async () => {
    await POST(requete('sans-origine@example.org'));
    expect(jetonDe(0, 'confirm')?.source).toBe('website');
  });

  it('origine hors liste : 400 sans détail, rien n’est envoyé', async () => {
    const res = await POST(requete('pirate@example.org', { origine: 'ailleurs' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid input' });
    expect(send).not.toHaveBeenCalled();
  });
});
