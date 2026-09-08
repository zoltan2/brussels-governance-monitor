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
    const before = Date.now();
    await GET(request());

    const since = listPreordersSince.mock.calls[0][0] as number;
    expect(before - since).toBeGreaterThanOrEqual(7 * DAY);
    expect(before - since).toBeLessThan(7 * DAY + 5000);
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

  it("remonte un échec d'envoi en 500, pour que le cron le signale", async () => {
    send.mockResolvedValue({ data: null, error: { message: 'boom' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(request());

    expect(res.status).toBe(500);
    vi.restoreAllMocks();
  });
});
