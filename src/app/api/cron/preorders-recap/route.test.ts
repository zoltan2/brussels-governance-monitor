// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Récap hebdomadaire des précommandes du livre, envoyé le mardi à 09:00.
 *
 * Le test le plus important de ce fichier est celui de la semaine vide : le
 * mail part même à zéro précommande, pour qu'une boîte silencieuse signifie
 * « le cron est cassé » et non « semaine calme ». C'est précisément cette
 * ambiguïté qui a laissé passer quatre mois de pertes en 2026.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const send = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

const listPreordersSince = vi.fn();
vi.mock('@/lib/preorder-log', () => ({
  listPreordersSince: (...args: unknown[]) => listPreordersSince(...args),
}));

process.env.RESEND_API_KEY = 'test-key';
process.env.CRON_SECRET = 'secret-de-test';

const { GET } = await import('./route');

const DAY = 24 * 60 * 60 * 1000;

function request(secret = 'secret-de-test'): Request {
  return new Request('https://governance.brussels/api/cron/preorders-recap', {
    headers: { authorization: `Bearer ${secret}` },
  });
}

beforeEach(() => {
  send.mockReset().mockResolvedValue({ data: { id: 'e1' }, error: null });
  listPreordersSince.mockReset().mockResolvedValue([]);
});

describe('GET /api/cron/preorders-recap', () => {
  it('refuse un appel sans le secret cron', async () => {
    const res = await GET(request('mauvais-secret'));

    expect(res.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it('interroge une fenêtre de sept jours', async () => {
    // L'assertion d'origine comparait `before - since` à exactement 7 jours,
    // ce qui n'est vrai que si le Date.now() du test et celui de la route
    // tombent dans la MÊME milliseconde : rouge au hasard en CI. On encadre.
    const before = Date.now();
    await GET(request());
    const after = Date.now();

    const since = listPreordersSince.mock.calls[0][0] as number;
    expect(since).toBeGreaterThanOrEqual(before - 7 * DAY);
    expect(since).toBeLessThanOrEqual(after - 7 * DAY);
  });

  it('liste prénom et email de chaque personne de la semaine', async () => {
    listPreordersSince.mockResolvedValue([
      { email: 'alixe@example.be', firstName: 'Alixe', created_at: Date.now() },
      { email: 'marc@example.be', firstName: 'Marc', created_at: Date.now() },
    ]);

    await GET(request());

    const mail = send.mock.calls[0][0];
    expect(mail.to).toBe('contact@brusselsgovernance.be');
    expect(mail.html).toContain('alixe@example.be');
    expect(mail.html).toContain('Alixe');
    expect(mail.html).toContain('marc@example.be');
    expect(mail.html).toContain('Marc');
    expect(mail.subject).toContain('2');
  });

  it('part quand même sur une semaine sans aucune précommande', async () => {
    listPreordersSince.mockResolvedValue([]);

    const res = await GET(request());

    expect(send).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(send.mock.calls[0][0].subject).toContain('0');
  });

  it('envoie quand même quand le journal est illisible, sinon la panne se cache', async () => {
    // Le mail EST le détecteur de panne. S'il disparaît quand le journal
    // casse, un journal cassé produit le même silence qu'une semaine calme :
    // exactement la récidive du sinistre d'avril, dans le garde-fou.
    listPreordersSince.mockRejectedValue(new Error('database is locked'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(request());

    expect(send).toHaveBeenCalled();
    // Assertion volontairement précise : /journal/ seul matcherait déjà la
    // note de provenance en pied de mail, ce serait un faux vert.
    expect(send.mock.calls[0][0].html).toContain('journal est illisible');
    expect(send.mock.calls[0][0].subject).toContain('illisible');
    // 500 pour que systemd et journald enregistrent l'échec du cron.
    expect(res.status).toBe(500);
    vi.restoreAllMocks();
  });

  it('neutralise le HTML dans un prénom', async () => {
    listPreordersSince.mockResolvedValue([
      {
        email: 'x@example.be',
        firstName: '<a href="https://evil.example">Payer</a>',
        created_at: Date.now(),
      },
    ]);

    await GET(request());

    const html = send.mock.calls[0][0].html;
    expect(html).not.toContain('<a href="https://evil.example"');
    expect(html).toContain('&lt;a href=');
  });

  it('se protège du mode sombre, comme le digest', async () => {
    await GET(request());

    const html = send.mock.calls[0][0].html;
    expect(html).toContain('color-scheme');
    expect(html).toContain('only light');
  });

  it('expose un vrai tableau de données aux lecteurs d’écran', async () => {
    listPreordersSince.mockResolvedValue([
      { email: 'x@example.be', firstName: 'X', created_at: Date.now() },
    ]);

    await GET(request());

    const html = send.mock.calls[0][0].html;
    // La table qui porte des <th> ne doit pas être déclarée décorative.
    expect(html).toMatch(/<table(?![^>]*role="presentation")[^>]*>\s*<tr>\s*<th/);
    expect(html).toContain('scope="col"');
  });

  it('n’utilise pas une couleur de texte sous le seuil AA', async () => {
    await GET(request());

    // #9ca3af mesure 2,54:1 sur blanc. #6b7280 passe à 4,83:1.
    expect(send.mock.calls[0][0].html).not.toContain('#9ca3af');
  });

  it("remonte un échec d'envoi en 500, pour que le cron le signale", async () => {
    send.mockResolvedValue({ data: null, error: { message: 'boom' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(request());

    expect(res.status).toBe(500);
    vi.restoreAllMocks();
  });
});
