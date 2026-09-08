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

process.env.RESEND_API_KEY = 'test-key';

const { POST } = await import('./route');

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
});

describe('POST /api/livre/precommande', () => {
  it('écrit dans le journal, seule trace qui ne dépende pas de Resend', async () => {
    await POST(request(VALID));

    expect(recordPreorder).toHaveBeenCalledWith({
      email: 'nathalie@example.be',
      firstName: 'Nathalie',
    });
  });

  it('journalise même quand Resend refuse le contact', async () => {
    // C'est tout l'intérêt : le sinistre du 16/04 au 08/09 est précisément
    // une panne Resend silencieuse. Le journal doit y survivre.
    create.mockResolvedValue({
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

  it("n'étiquette la précommande qu'avec des propriétés déclarées côté Resend", async () => {
    await POST(request(VALID));

    const declared = ['sources', 'locale', 'topics'];
    const written = create.mock.calls[0][0].properties ?? {};

    expect(Object.keys(written)).not.toContain('source');
    for (const key of Object.keys(written)) {
      expect(declared).toContain(key);
    }
    expect(written.sources).toContain('livre-precommande');
  });

  it("rejoue l'étiquette en update, sans quoi Resend ne la persiste pas", async () => {
    // Constat du 08/09 : le contact de Céline (créé le 16/04 avec une
    // propriété passée à create) a `properties: {}` côté Resend. C'est pour
    // cela que addContact() fait create *puis* update avec les mêmes valeurs.
    await POST(request(VALID));

    expect(update).toHaveBeenCalled();
    expect(update.mock.calls[0][0].properties.sources).toContain(
      'livre-precommande',
    );
  });

  it('signale un échec de création de contact au lieu de le passer sous silence', async () => {
    create.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', statusCode: 422, message: 'unknown property' },
    });
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

    await POST(request(VALID));

    expect(errors).toHaveBeenCalled();
    const logged = errors.mock.calls.flat().join(' ');
    expect(logged).toContain('livre-precommande-FAIL');
    errors.mockRestore();
  });

  it('envoie quand même la confirmation quand Resend refuse le contact', async () => {
    create.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', statusCode: 422, message: 'unknown property' },
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(request(VALID));

    expect(send).toHaveBeenCalled();
    expect(res.status).toBe(200);
    vi.restoreAllMocks();
  });
});
