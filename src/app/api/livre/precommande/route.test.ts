// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Régression du 2026-09-08 : aucune précommande du livre n'était enregistrée
 * depuis le 16/04, sans le moindre signal.
 *
 * Deux causes distinctes, une par test ci-dessous :
 *
 * 1. La route écrivait `properties: { source: 'livre-precommande' }`. Or le
 *    compte Resend ne déclare que `sources`, `locale` et `topics` : une clé
 *    non déclarée est refusée. C'est exactement le sinistre de la PR #170
 *    (2026-04-22), que le cron contacts-healthcheck surveille pour
 *    `addContact` mais pas pour cette route.
 *
 * 2. Elle jetait le résultat de `contacts.create` sans lire `error`. Le
 *    contact n'était donc pas créé, l'email de confirmation partait quand
 *    même, et personne ne pouvait s'en apercevoir.
 *
 * Puis, septembre 2026 : ce contact créé d'office abonnait au digest entier
 * quelqu'un qui n'avait demandé qu'un livre, sans lien de désabonnement. La
 * route ne crée plus aucun contact elle-même. L'inscription au digest passe
 * par une case à cocher, puis par le double opt-in standard.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const create = vi.fn();
const update = vi.fn();
const send = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    contacts = { create, update };
    emails = { send };
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ allowed: true, remaining: 4 }),
}));

const recordPreorder = vi.fn();
vi.mock('@/lib/preorder-log', () => ({
  recordPreorder: (...args: unknown[]) => recordPreorder(...args),
}));

const getContact = vi.fn();
const mergeContactSources = vi.fn();
vi.mock('@/lib/resend', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/resend')>()),
  getContact: (...args: unknown[]) => getContact(...args),
  mergeContactSources: (...args: unknown[]) => mergeContactSources(...args),
}));

// Le gabarit rend un arbre React opaque : on garde ses arguments à la place.
vi.mock('@/emails/confirm', () => ({
  default: (props: { locale: string; confirmUrl: string }) => ({ props }),
}));

process.env.RESEND_API_KEY = 'test-key';
process.env.AUTH_SECRET = 'secret-de-test';

const { POST } = await import('./route');

/** Charge utile du jeton de confirmation, lue dans l'URL du mail. */
function tokenPayload(confirmUrl: string): Record<string, unknown> {
  const token = decodeURIComponent(new URL(confirmUrl).searchParams.get('token')!);
  return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
}

function request(body: unknown): Request {
  return new Request('https://governance.brussels/api/livre/precommande', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID = { firstName: 'Nathalie', email: 'nathalie@example.be' };

beforeEach(() => {
  recordPreorder.mockReset().mockResolvedValue(undefined);
  create.mockReset().mockResolvedValue({ data: { id: 'c1' }, error: null });
  update.mockReset().mockResolvedValue({ data: { id: 'c1' }, error: null });
  send.mockReset().mockResolvedValue({ data: { id: 'e1' }, error: null });
  getContact.mockReset().mockResolvedValue(null);
  mergeContactSources.mockReset().mockResolvedValue(true);
});

describe('POST /api/livre/precommande', () => {
  it('neutralise le HTML injecté dans le prénom', async () => {
    // Le prénom accepte 100 caractères libres ET le destinataire est fourni
    // par le même formulaire public : sans échappement, n'importe qui envoie
    // du HTML arbitraire depuis un domaine vérifié BGM vers l'adresse de son
    // choix. Hameçonnage adossé à la réputation d'envoi du projet.
    await POST(
      request({
        firstName: '<a href="https://evil.example">Payer maintenant</a>',
        email: 'victime@example.be',
      }),
    );

    const html = send.mock.calls[0][0].html;
    expect(html).not.toContain('<a href="https://evil.example"');
    expect(html).toContain('&lt;a href=');
  });

  it('rend des messages d’erreur en français correctement accentué', async () => {
    const res = await POST(request({ firstName: '', email: 'pas-un-email' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('Prénom');
    expect(body.error).not.toMatch(/Prenom|requetes|Reessayez|configure\b/);
  });

  it('écrit dans le journal, seule trace qui ne dépende pas de Resend', async () => {
    await POST(request(VALID));

    expect(recordPreorder).toHaveBeenCalledWith({
      email: 'nathalie@example.be',
      firstName: 'Nathalie',
    });
  });

  it('journalise même quand Resend refuse l’envoi', async () => {
    // C'est tout l'intérêt : le sinistre du 16/04 au 08/09 est précisément
    // une panne Resend silencieuse. Le journal doit y survivre.
    send.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', statusCode: 422, message: 'nope' },
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await POST(request(VALID));

    expect(recordPreorder).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("n'échoue pas la précommande si le journal est indisponible", async () => {
    recordPreorder.mockRejectedValue(new Error('redis down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(request(VALID));

    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("n'abonne personne au digest sans la case cochée", async () => {
    // VALID ne porte pas `digestOptIn` : l'absence vaut refus.
    const res = await POST(request(VALID));

    expect(res.status).toBe(200);
    // Reponse invariante : elle ne dit jamais si l'adresse etait deja connue.
    expect(await res.json()).toEqual({ success: true });
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(getContact).not.toHaveBeenCalled();
    expect(mergeContactSources).not.toHaveBeenCalled();
    // Un seul email : la confirmation de précommande.
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].tags).toContainEqual({
      name: 'type',
      value: 'livre-precommande',
    });
  });

  it("n'abonne personne non plus avec la case décochée", async () => {
    await POST(request({ ...VALID, digestOptIn: false }));

    expect(create).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('case cochée : passe par le double opt-in, sans créer de contact', async () => {
    const res = await POST(request({ ...VALID, digestOptIn: true }));

    expect(await res.json()).toEqual({ success: true });
    // Le contact n'est créé qu'au clic sur le lien, par /api/confirm et
    // addContact(), le chemin que surveille contacts-healthcheck.
    expect(create).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(2);

    const confirm = send.mock.calls[1][0];
    expect(confirm.to).toBe('nathalie@example.be');
    expect(confirm.tags).toContainEqual({ name: 'type', value: 'confirm' });

    const { confirmUrl, locale } = confirm.react.props;
    expect(locale).toBe('fr');
    expect(confirmUrl).toContain('/fr/subscribe/confirm?token=');
    const payload = tokenPayload(confirmUrl);
    expect(payload.email).toBe('nathalie@example.be');
    expect(payload.source).toBe('livre-precommande');
    // Des thèmes explicites : un contact sans thème reçoit tout sans l'avoir
    // choisi, c'était le second défaut de l'ancien contact créé d'office.
    expect((payload.topics as string[]).length).toBeGreaterThan(0);
  });

  it('case cochée, déjà abonné : note la source, sans second email', async () => {
    getContact.mockResolvedValue({
      locale: 'fr',
      topics: ['budget'],
      sources: ['website'],
    });

    const res = await POST(request({ ...VALID, digestOptIn: true }));

    expect(mergeContactSources).toHaveBeenCalledWith('nathalie@example.be', [
      'livre-precommande',
    ]);
    expect(send).toHaveBeenCalledTimes(1);
    // Le seul email parti est celui de la precommande : pas de second envoi vers
    // une adresse deja abonnee. Et la reponse est la meme que pour une adresse
    // inconnue, sans quoi elle repondrait « cette personne est abonnee ».
    expect(await res.json()).toEqual({ success: true });
  });

  it("n'échoue pas la précommande si l'inscription au digest échoue, et ne le dit pas au client", async () => {
    send
      .mockResolvedValueOnce({ data: { id: 'e1' }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { name: 'application_error', statusCode: 500, message: 'boom' },
      });
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(request({ ...VALID, digestOptIn: true }));

    expect(res.status).toBe(200);
    // L'echec est signale la ou il sert — le journal serveur — et nulle part
    // ailleurs : une reponse qui varie selon l'etat du contact enumere le fichier.
    expect(await res.json()).toEqual({ success: true });
    expect(errors.mock.calls.flat().join(' ')).toContain('livre-precommande-FAIL');
    errors.mockRestore();
  });

  it("n'envoie pas la confirmation digest si la précommande n'a pas pu être confirmée", async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: 'application_error', statusCode: 500, message: 'boom' },
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(request({ ...VALID, digestOptIn: true }));

    expect(res.status).toBe(500);
    expect(send).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});
