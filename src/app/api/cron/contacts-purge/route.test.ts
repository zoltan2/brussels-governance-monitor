// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Purge RGPD quotidienne (décision du 29/09/2026). Le test le plus important
 * est celui du mode à blanc : sans CONTACTS_PURGE_ENABLED=1, rien ne doit être
 * supprimé ni écrit, ni chez Resend ni dans la base.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.RESEND_API_KEY = 'test-key';
process.env.CRON_SECRET = 'secret-cron';
process.env.AUTH_SECRET = 'secret-auth';

const listUnsubscribedContacts = vi.fn();
const deleteContactById = vi.fn();
vi.mock('@/lib/resend', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/resend')>()),
  listUnsubscribedContacts: () => listUnsubscribedContacts(),
  deleteContactById: (id: string) => deleteContactById(id),
}));

const { GET } = await import('./route');
const { getDb } = await import('@/lib/db');
const { fingerprintEmail, noterDesabonnement, lireDesabonnement, JOUR_MS } = await import(
  '@/lib/desabonnements'
);
const { pushLogSqlite } = await import('@/lib/chat-logs');

const db = getDb()!;

function requete(secret = 'secret-cron'): Request {
  return new Request('https://governance.brussels/api/cron/contacts-purge', {
    headers: { authorization: `Bearer ${secret}` },
  });
}

function contacts(...emails: string[]) {
  return {
    contacts: emails.map((email, i) => ({ id: `c${i}`, email })),
    complete: true,
  };
}

const ANCIEN = 'ancien@example.org'; // désabonné il y a 31 jours
const RECENT = 'recent@example.org'; // désabonné il y a 29 jours
const INCONNU = 'inconnu@example.org'; // désabonné avant la mise en service

function semer() {
  const maintenant = Date.now();
  noterDesabonnement(db, fingerprintEmail(ANCIEN), maintenant - 31 * JOUR_MS);
  noterDesabonnement(db, fingerprintEmail(RECENT), maintenant - 29 * JOUR_MS);
  // Une empreinte de plus de 24 mois, une de 23 mois.
  noterDesabonnement(db, 'empreinte-perimee', maintenant - 800 * JOUR_MS);
  noterDesabonnement(db, 'empreinte-23-mois', maintenant - 700 * JOUR_MS);
  // Une question de 91 jours, une de 10 jours, un retour d'avis de 200 jours.
  pushLogSqlite(db, 'usage', { question: 'vieille' });
  pushLogSqlite(db, 'usage', { question: 'recente' });
  pushLogSqlite(db, 'feedback', { value: 1 });
  db.prepare("UPDATE chat_logs SET created_at = ? WHERE payload LIKE '%vieille%'").run(
    maintenant - 91 * JOUR_MS,
  );
  db.prepare("UPDATE chat_logs SET created_at = ? WHERE stream = 'feedback'").run(
    maintenant - 200 * JOUR_MS,
  );
}

function compterLignes(table: string): number {
  return Number((db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n);
}

let log: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  db.exec('DELETE FROM desabonnements; DELETE FROM chat_logs;');
  delete process.env.CONTACTS_PURGE_ENABLED;
  listUnsubscribedContacts.mockReset().mockResolvedValue(contacts(ANCIEN, RECENT, INCONNU));
  deleteContactById.mockReset().mockResolvedValue(null);
  log = vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/cron/contacts-purge', () => {
  it('refuse un appel sans le secret cron', async () => {
    const res = await GET(requete('mauvais'));
    expect(res.status).toBe(401);
    expect(listUnsubscribedContacts).not.toHaveBeenCalled();
  });

  it('à blanc par défaut : compte, mais ne supprime ni n’écrit rien', async () => {
    semer();
    const res = await GET(requete());
    const corps = await res.json();

    expect(res.status).toBe(200);
    expect(corps).toMatchObject({
      mode: 'a-blanc',
      contactsDesinscrits: 3,
      sansLigne: 1,
      enAttente: 1,
      aSupprimer: 1,
      contactsSupprimes: 0,
      lignesExpirees: 1,
      questionsExpirees: 1,
    });
    expect(deleteContactById).not.toHaveBeenCalled();
    // Rien d'écrit : ni ligne de première observation, ni purge.
    expect(lireDesabonnement(db, fingerprintEmail(INCONNU))).toBeNull();
    expect(lireDesabonnement(db, 'empreinte-perimee')).not.toBeNull();
    expect(lireDesabonnement(db, fingerprintEmail(ANCIEN))?.contact_supprime_le).toBeNull();
    expect(compterLignes('chat_logs')).toBe(3);
  });

  it('une autre valeur que « 1 » laisse le mode à blanc', async () => {
    process.env.CONTACTS_PURGE_ENABLED = 'true';
    semer();
    const corps = await (await GET(requete())).json();
    expect(corps.mode).toBe('a-blanc');
    expect(deleteContactById).not.toHaveBeenCalled();
  });

  it('actif : supprime le contact de 30 jours et plus, seulement lui', async () => {
    process.env.CONTACTS_PURGE_ENABLED = '1';
    semer();
    const res = await GET(requete());
    const corps = await res.json();

    expect(res.status).toBe(200);
    expect(corps).toMatchObject({ mode: 'actif', aSupprimer: 1, contactsSupprimes: 1 });
    expect(deleteContactById).toHaveBeenCalledTimes(1);
    expect(deleteContactById).toHaveBeenCalledWith('c0'); // ANCIEN, jamais RECENT
    expect(lireDesabonnement(db, fingerprintEmail(ANCIEN))?.contact_supprime_le).toEqual(
      expect.any(Number),
    );
    // La ligne reste : l'empreinte est gardée 24 mois après le désabonnement.
    expect(lireDesabonnement(db, fingerprintEmail(RECENT))?.contact_supprime_le).toBeNull();
  });

  it('actif : un désabonné sans ligne en reçoit une datée du jour, et n’est pas supprimé', async () => {
    process.env.CONTACTS_PURGE_ENABLED = '1';
    const avant = Date.now();
    const corps = await (await GET(requete())).json();

    expect(corps.sansLigne).toBe(3);
    expect(deleteContactById).not.toHaveBeenCalled();
    const ligne = lireDesabonnement(db, fingerprintEmail(INCONNU));
    expect(ligne?.desabonne_le).toBeGreaterThanOrEqual(avant);
  });

  it('actif : efface les empreintes de plus de 24 mois et les questions de plus de 90 jours', async () => {
    process.env.CONTACTS_PURGE_ENABLED = '1';
    semer();
    const corps = await (await GET(requete())).json();

    expect(corps.lignesExpirees).toBe(1);
    expect(corps.questionsExpirees).toBe(1);
    expect(lireDesabonnement(db, 'empreinte-perimee')).toBeNull();
    expect(lireDesabonnement(db, 'empreinte-23-mois')).not.toBeNull();
    const questions = db
      .prepare("SELECT payload FROM chat_logs WHERE stream = 'usage'")
      .all() as { payload: string }[];
    expect(questions.map((q) => JSON.parse(q.payload).question)).toEqual(['recente']);
    // Les autres flux gardent leur seul plafond de 10 000 entrées.
    expect(compterLignes("chat_logs WHERE stream = 'feedback'")).toBe(1);
  });

  it('une suppression refusée par Resend est comptée, rend 500, et la ligne reste à refaire', async () => {
    process.env.CONTACTS_PURGE_ENABLED = '1';
    semer();
    deleteContactById.mockResolvedValue('validation_error 422');
    const res = await GET(requete());
    const corps = await res.json();

    expect(res.status).toBe(500);
    expect(corps).toMatchObject({ erreursResend: 1, contactsSupprimes: 0 });
    expect(lireDesabonnement(db, fingerprintEmail(ANCIEN))?.contact_supprime_le).toBeNull();
  });

  it('une liste Resend incomplète rend 500', async () => {
    listUnsubscribedContacts.mockResolvedValue({ contacts: [], complete: false, error: 'x' });
    const res = await GET(requete());
    expect(res.status).toBe(500);
    expect((await res.json()).listeComplete).toBe(false);
  });

  it('ne journalise ni ne renvoie aucune adresse ni empreinte', async () => {
    process.env.CONTACTS_PURGE_ENABLED = '1';
    semer();
    const texte = await (await GET(requete())).text();
    const journal = JSON.stringify(log.mock.calls);
    for (const email of [ANCIEN, RECENT, INCONNU]) {
      for (const sortie of [texte, journal]) {
        expect(sortie).not.toContain(email);
        expect(sortie).not.toContain(fingerprintEmail(email));
      }
    }
  });
});
