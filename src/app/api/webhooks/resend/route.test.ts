// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/** Webhook Resend : signature, journal sans adresse, alerte unique. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Webhook } from 'standardwebhooks';

process.env.DB_PATH = ':memory:';
process.env.AUTH_SECRET = 'secret-auth';
process.env.ALERT_EMAIL = 'alertes@example.net';
const SECRET = 'whsec_' + Buffer.from('cle-de-test-du-webhook-32-octets!').toString('base64');
process.env.RESEND_WEBHOOK_SECRET = SECRET;

const send = vi.fn();
vi.mock('@/lib/resend', async (importOriginal) => {
  const vrai = await importOriginal<typeof import('@/lib/resend')>();
  const { Resend } = await import('resend');
  const webhooks = new Resend('re_test').webhooks;
  return {
    ...vrai,
    getResend: () => ({ emails: { send }, webhooks }),
    resendCall: (fn: () => unknown) => fn(),
  };
});

const { POST } = await import('./route');
const { getDb } = await import('@/lib/db');
const db = getDb()!;

function requete(corps: object, { id = 'msg_1', signer = true } = {}): Request {
  const texte = JSON.stringify(corps);
  const ts = new Date();
  const signature = signer ? new Webhook(SECRET).sign(id, ts, texte) : 'v1,faux';
  return new Request('https://governance.brussels/api/webhooks/resend', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'webhook-id': id,
      'webhook-timestamp': String(Math.floor(ts.getTime() / 1000)),
      'webhook-signature': signature,
    },
    body: texte,
  });
}

const PLAINTE = {
  type: 'email.complained',
  created_at: '2026-11-05T07:10:00Z',
  data: { email_id: 'em_1', to: ['abonnee@example.org'], subject: 'x', tags: { type: 'coulisses' } },
};

beforeEach(() => {
  db.exec('DELETE FROM resend_evenements');
  send.mockReset().mockResolvedValue({ data: { id: 'a1' }, error: null });
});

describe('POST /api/webhooks/resend', () => {
  it('refuse une signature fausse sans rien inscrire', async () => {
    const res = await POST(requete(PLAINTE, { signer: false }));
    expect(res.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
    expect(db.prepare('SELECT COUNT(*) AS n FROM resend_evenements').get()).toEqual({ n: 0 });
  });

  it("inscrit une plainte sans l'adresse en clair et alerte une fois", async () => {
    const res = await POST(requete(PLAINTE));
    expect(res.status).toBe(200);
    const ligne = db.prepare('SELECT * FROM resend_evenements').get() as Record<string, unknown>;
    expect(ligne.type).toBe('email.complained');
    expect(ligne.envoi).toBe('coulisses');
    expect(JSON.stringify(ligne)).not.toContain('abonnee@example.org');
    expect(send).toHaveBeenCalledTimes(1);
    const alerte = send.mock.calls[0][0];
    expect(alerte.to).toBe('alertes@example.net');
    expect(alerte.text).not.toContain('abonnee@example.org');
  });

  it("n'alerte pas deux fois pour un événement redélivré", async () => {
    await POST(requete(PLAINTE));
    const res = await POST(requete(PLAINTE));
    expect((await res.json()).duplicate).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('ignore les autres types sans alerte', async () => {
    const res = await POST(requete({ ...PLAINTE, type: 'email.delivered' }, { id: 'msg_2' }));
    expect((await res.json()).ignored).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it('lit le tag sous forme de liste', async () => {
    await POST(requete({ ...PLAINTE, type: 'email.bounced', data: { ...PLAINTE.data, tags: [{ name: 'type', value: 'digest' }] } }, { id: 'msg_3' }));
    expect((db.prepare('SELECT envoi FROM resend_evenements').get() as { envoi: string }).envoi).toBe('digest');
  });
});
