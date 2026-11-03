// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.AUTH_SECRET = 'secret-auth';

const contacts: Array<Record<string, unknown>> = [];
const details: Record<string, Record<string, { value: string }>> = {};
const batchSend = vi.fn();
vi.mock('@/lib/resend', () => ({
  getResend: () => ({
    contacts: {
      list: async () => ({ data: { data: contacts, has_more: false }, error: null }),
      get: async ({ id }: { id: string }) => ({ data: { properties: details[id] }, error: null }),
    },
    batch: { send: (...a: unknown[]) => batchSend(...a) },
  }),
  resendCall: (fn: () => unknown) => fn(),
}));

const { render } = await import('@react-email/render');
const { getDb } = await import('@/lib/db');
const J = await import('./journal');
const { envoyerNumero, envoyerEssai, construireMail, COULISSES_FROM } = await import('./envoi');
const db = getDb()!;

const T = {
  fr: { objet: 'Où en est BGM', corps: 'Bonjour,\n\nTexte.\n\nZoltán' },
  nl: { objet: 'Waar BGM staat', corps: 'Hallo,\n\nTekst.\n\nZoltán' },
  en: { objet: 'Where BGM stands', corps: 'Hello,\n\nText.\n\nZoltán' },
};
const SITE = 'https://governance.brussels';
const MAINTENANT = Date.parse('2026-11-05T07:00:00Z');

function abonne(id: string, locale = 'fr', extra: Record<string, string> = {}) {
  contacts.push({ id, email: `${id}@example.org`, unsubscribed: false, created_at: '2026-06-01 10:00:00.000+00' });
  details[id] = { locale: { value: locale }, sources: { value: 'website' }, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, { value: v }])) };
}

function preparer() {
  J.enregistrerTextes(db, 1, T);
  J.noterEssai(db, 1, J.empreinteTextes(T));
  expect(J.prendreVerrou(db, 1)).toBe(true);
}

beforeEach(() => {
  contacts.length = 0;
  for (const k of Object.keys(details)) delete details[k];
  db.exec('DELETE FROM coulisses_numeros; DELETE FROM coulisses_envois;');
  batchSend.mockReset().mockImplementation(async (mails: unknown[]) => ({
    data: { data: mails.map((_, i) => ({ id: `em_${i}` })) },
    error: null,
  }));
  process.env.COULISSES_EXCLUS = '';
});

describe('envoyerNumero', () => {
  it('envoie à chacun une fois, avec la bonne langue et la variante premier mot', async () => {
    abonne('a', 'fr');
    abonne('b', 'de');
    abonne('c', 'nl', { mot_mensuel: 'non' });
    preparer();
    const r = await envoyerNumero(db, 1, SITE, MAINTENANT);
    expect(r.erreurs).toEqual([]);
    expect(r.envoyes).toEqual({ 'fr-premier': 1, 'en-premier': 1 });
    expect(r.exclus.refus).toBe(1);
    const mails = batchSend.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(mails.map((m) => m.to)).toEqual(['a@example.org', 'b@example.org']);
    expect(mails[0].from).toBe(COULISSES_FROM);
    expect(mails[0].replyTo).toBe('contact@brusselsgovernance.be');
    expect(J.lireNumero(db, 1)!.etat).toBe('envoye');
  });

  it("une reprise n'envoie pas deux fois", async () => {
    abonne('a');
    preparer();
    await envoyerNumero(db, 1, SITE, MAINTENANT);
    J.terminer(db, 1, 'interrompu', {});
    expect(J.prendreVerrou(db, 1)).toBe(true);
    const r = await envoyerNumero(db, 1, SITE, MAINTENANT);
    expect(batchSend).toHaveBeenCalledTimes(1);
    expect(r.exclus.deja_envoye).toBe(1);
  });

  it('lot refusé par Resend : rien de parti, réservations libérées', async () => {
    abonne('a');
    preparer();
    batchSend.mockResolvedValue({ data: null, error: { statusCode: 422, name: 'validation_error', message: 'x' } });
    const r = await envoyerNumero(db, 1, SITE, MAINTENANT);
    expect(r.refusesParResend).toBe(1);
    expect(J.dejaAuJournal(db, 1).size).toBe(0);
    expect(J.lireNumero(db, 1)!.etat).toBe('interrompu');
  });

  it('réponse perdue : marqué incertain, jamais renvoyé automatiquement', async () => {
    abonne('a');
    preparer();
    batchSend.mockResolvedValue({ data: null, error: { statusCode: null, name: 'application_error', message: 'réseau' } });
    const r = await envoyerNumero(db, 1, SITE, MAINTENANT);
    expect(r.incertains).toBe(1);
    expect(J.compterJournal(db, 1)).toEqual({ incertain: 1 });
    expect(J.prendreVerrou(db, 1)).toBe(true);
    batchSend.mockClear();
    await envoyerNumero(db, 1, SITE, MAINTENANT);
    expect(batchSend).not.toHaveBeenCalled();
  });

  it('erreur 5xx : issue inconnue, marqué incertain (jamais libéré ni renvoyé)', async () => {
    abonne('a');
    preparer();
    batchSend.mockResolvedValue({ data: null, error: { statusCode: 504, name: 'application_error', message: 'Gateway Timeout' } });
    const r = await envoyerNumero(db, 1, SITE, MAINTENANT);
    expect(r.incertains).toBe(1);
    expect(r.refusesParResend).toBe(0);
    expect(J.compterJournal(db, 1)).toEqual({ incertain: 1 });
  });

  it('exception pendant l’appel : incertain, pas de réservation orpheline', async () => {
    abonne('a');
    preparer();
    batchSend.mockRejectedValue(new Error('rendu impossible'));
    const r = await envoyerNumero(db, 1, SITE, MAINTENANT);
    expect(r.incertains).toBe(1);
    expect(J.compterJournal(db, 1)).toEqual({ incertain: 1 });
  });

  it('passe une clé d’idempotence par lot, propre au lancement (une reprise ne réutilise pas la clé)', async () => {
    abonne('a');
    preparer();
    await envoyerNumero(db, 1, SITE, MAINTENANT);
    const cle = (batchSend.mock.calls[0][1] as { idempotencyKey: string }).idempotencyKey;
    expect(cle).toMatch(/^coulisses-1-[0-9a-z]+-a$/);
  });

  it('lot refusé (422) à cause d’une adresse : renvoi un par un, seule la fautive reste dehors', async () => {
    abonne('a');
    abonne('b');
    preparer();
    batchSend.mockImplementation(async (mails: Array<{ to: string }>) =>
      mails.length > 1 || mails[0].to === 'b@example.org'
        ? { data: null, error: { statusCode: 422, name: 'validation_error', message: 'Invalid `to` field: b@example.org' } }
        : { data: { data: [{ id: 'r1' }] }, error: null },
    );
    const r = await envoyerNumero(db, 1, SITE, MAINTENANT);
    expect(r.refusesParResend).toBe(1);
    expect(r.envoyes).toEqual({ 'fr-premier': 1 });
    expect(J.compterJournal(db, 1)).toEqual({ envoye: 1 });
    // Aucune adresse dans le rapport.
    expect(r.erreurs.join(' ')).not.toContain('@');
    expect(r.erreurs.join(' ')).toContain('[adresse]');
  });

  it('battement : verrou_le avance après chaque lot', async () => {
    abonne('a');
    preparer();
    db.prepare('UPDATE coulisses_numeros SET verrou_le = 1 WHERE numero = 1').run();
    let vu = 0;
    batchSend.mockImplementation(async () => ({ data: { data: [{ id: 'r' }] }, error: null }));
    const avant = Date.now();
    await envoyerNumero(db, 1, SITE, MAINTENANT);
    vu = J.lireNumero(db, 1)!.verrouLe ?? 0;
    expect(vu).toBeGreaterThanOrEqual(avant);
  });

  it('refuse sans COULISSES_EXCLUS et sans rien envoyer', async () => {
    delete process.env.COULISSES_EXCLUS;
    abonne('a');
    preparer();
    const r = await envoyerNumero(db, 1, SITE, MAINTENANT);
    expect(r.erreurs[0]).toMatch(/COULISSES_EXCLUS/);
    expect(batchSend).not.toHaveBeenCalled();
  });

  it('refuse un numéro non verrouillé', async () => {
    J.enregistrerTextes(db, 1, T);
    await expect(envoyerNumero(db, 1, SITE, MAINTENANT)).rejects.toThrow(/verrouill/);
  });

  it('variante courante au numéro 2 pour qui a reçu le 1', async () => {
    abonne('a');
    preparer();
    await envoyerNumero(db, 1, SITE, MAINTENANT);
    J.enregistrerTextes(db, 2, T);
    J.noterEssai(db, 2, J.empreinteTextes(T));
    J.prendreVerrou(db, 2);
    const r = await envoyerNumero(db, 2, SITE, MAINTENANT);
    expect(r.envoyes).toEqual({ 'fr-courant': 1 });
  });
});

describe('envoyerEssai', () => {
  it("envoie les trois langues et la version des germanophones à l'administrateur seulement, et note l'essai", async () => {
    abonne('a');
    J.enregistrerTextes(db, 1, T);
    const r = await envoyerEssai(db, 1, 'admin@example.net', SITE);
    expect(r.envoyes).toBe(4);
    const mails = batchSend.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(new Set(mails.map((m) => m.to))).toEqual(new Set(['admin@example.net']));
    expect(mails.map((m) => m.subject)).toContain('[Essai de→en premier] Where BGM stands');
    expect(J.lireNumero(db, 1)!.essaiEmpreinte).toBe(J.empreinteTextes(T));
  });
});

describe('construireMail', () => {
  it('premier mot : P.-S. de refus et lien #coulisses ; en-tête one-click propre aux coulisses', async () => {
    const m = construireMail({ email: 'a@example.org', langue: 'fr', variante: 'premier' }, T, 1, SITE);
    const html = await render(m.react);
    expect(html).toContain('P.-S.');
    expect(html).toContain('#coulisses');
    expect(html).toContain('Gérer mes préférences');
    expect(m.headers['List-Unsubscribe']).toContain('/api/coulisses/one-click?token=');
  });

  it('numéro courant : pas de P.-S., mais toujours le lien de pied de page', async () => {
    const m = construireMail({ email: 'a@example.org', langue: 'nl', variante: 'courant' }, T, 2, SITE);
    const html = await render(m.react);
    expect(html).not.toContain('P.S.');
    expect(html).toContain('Mijn voorkeuren beheren');
  });

  it('pas de version texte écrite à la main : Resend la tire du HTML', () => {
    const m = construireMail({ email: 'a@example.org', langue: 'fr', variante: 'premier' }, T, 1, SITE);
    expect('text' in m).toBe(false);
  });

  it('signature : LinkedIn et chaîne WhatsApp ; un ancien texte brut devient des paragraphes', async () => {
    const html = await render(construireMail({ email: 'a@example.org', langue: 'fr', variante: 'courant' }, T, 1, SITE).react);
    expect(html).toContain('https://www.linkedin.com/in/zoltan');
    expect(html).toContain('https://whatsapp.com/channel/');
    expect(html).toMatch(/<p style="[^"]+">Texte\.<\/p>/);
  });

  it('corps HTML : intertitre, gras et lien stylés en ligne ; balises hors liste retirées', async () => {
    const H = { ...T, fr: { objet: 'x', corps: '<h2>Titre</h2><p><strong>Gras</strong> <a href="https://governance.brussels/fr/sondage">sondage</a></p><script>alert(1)</script><p><a href="javascript:alert(1)">piège</a></p>' } };
    const html = await render(construireMail({ email: 'a@example.org', langue: 'fr', variante: 'courant' }, H, 1, SITE).react);
    expect(html).toMatch(/<h2 style="[^"]+">Titre<\/h2>/);
    expect(html).toContain('<strong>Gras</strong>');
    expect(html).toMatch(/<a href="https:\/\/governance\.brussels\/fr\/sondage" style="[^"]+">sondage<\/a>/);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('javascript:');
  });

  it("aperçu : celui de l'admin s'il existe, sinon le début du texte (pas seulement « Bonjour, »)", async () => {
    const avec = { ...T, fr: { ...T.fr, apercu: 'Merci, et ce qui se passe derrière BGM' } };
    expect(await render(construireMail({ email: 'a@example.org', langue: 'fr', variante: 'courant' }, avec, 1, SITE).react)).toContain('Merci, et ce qui se passe derrière BGM');
    const { texteApercu } = await import('@/emails/coulisses');
    expect(texteApercu(T.fr.corps)).toBe('Bonjour, Texte. Zoltán');
    expect(texteApercu(`<p>${'mot '.repeat(60)}</p>`)).toHaveLength(150);
    expect(texteApercu('<p>x</p>', '  ')).toBe('x');
  });

  it('abonné en allemand : version anglaise avec la note en allemand en tête ; les autres sans note', async () => {
    const de = await render(construireMail({ email: 'a@example.org', langue: 'en', variante: 'courant', localeAbonne: 'de' }, T, 1, SITE).react);
    expect(de).toContain('nicht auf Deutsch schreiben kann');
    expect(de).toContain('Hello,');
    const en = await render(construireMail({ email: 'a@example.org', langue: 'en', variante: 'courant', localeAbonne: 'en' }, T, 1, SITE).react);
    expect(en).not.toContain('Deutsch');
  });
});

describe('masquerAdresses', () => {
  it('remplace toute adresse, garde le reste', async () => {
    const { masquerAdresses } = await import('./envoi');
    expect(masquerAdresses('Invalid `to` field: x.y+z@ex-ample.org (strict)')).toBe('Invalid `to` field: [adresse] (strict)');
    expect(masquerAdresses('<a@b.be>, c@d.be')).toBe('<[adresse]>, [adresse]');
  });
});
