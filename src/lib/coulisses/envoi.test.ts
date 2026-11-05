// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Textes } from './journal';

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
const { envoyerNumero, envoyerEssai, construireMail, contenuDuRendezVous, simuler, masquerAdresses, COULISSES_FROM } = await import('./envoi');
const { texteApercu } = await import('@/emails/coulisses');
const db = getDb()!;

/** Bienvenue : le repère du sondage entre deux paragraphes, bloc fr et nl, pas en. */
const B = {
  fr: { objet: 'Les coulisses de BGM : un mot plus personnel', corps: '<p>Bonjour,</p><p>[sondage]</p><p>Zoltán</p>', apercu: '', sondage: '<p>Répondez au <a href="https://governance.brussels/fr/sondage">sondage</a>.</p>' },
  nl: { objet: 'Achter de schermen', corps: '<p>Hallo,</p><p>[sondage]</p><p>Zoltán</p>', apercu: '', sondage: '<p>Vul de <a href="https://governance.brussels/nl/sondage">enquête</a> in.</p>' },
  en: { objet: 'Behind the scenes', corps: '<p>Hello,</p><p>[sondage]</p><p>Zoltán</p>', apercu: '', sondage: '' },
};
/** Édition d'un mois. */
const ED = {
  fr: { objet: 'Les coulisses de BGM : ce qui avance', corps: '<p>Ce mois-ci.</p>' },
  nl: { objet: 'Wat er beweegt', corps: '<p>Deze maand.</p>' },
  en: { objet: 'What moves', corps: '<p>This month.</p>' },
};

const SITE = 'https://governance.brussels';
const NOV = Date.parse('2026-11-05T07:00:00Z');
const DEC = Date.parse('2026-12-03T07:00:00Z');
const JAN = Date.parse('2027-01-07T07:00:00Z');
const FEV = Date.parse('2027-02-04T07:00:00Z');

function abonne(id: string, locale = 'fr', extra: Record<string, string> = {}, creeLe = '2026-06-01 10:00:00.000+00', email = `${id}@example.org`) {
  contacts.push({ id, email, unsubscribed: false, created_at: creeLe });
  details[id] = { locale: { value: locale }, sources: { value: 'website' }, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, { value: v }])) };
}

/** Rendez-vous du mois prêt et verrouillé : bienvenue (si absente), édition, essai. */
function preparer(mois: string, maintenant: number, edition: Partial<Textes> = {}): number {
  if (!J.lireBienvenue(db)) J.enregistrerBienvenue(db, B);
  const n = J.numeroDuMois(db, mois, true)!;
  J.enregistrerTextes(db, n, edition);
  const c = contenuDuRendezVous(db, n, maintenant)!;
  J.noterEssai(db, n, c.empreinte);
  expect(J.prendreVerrou(db, n, c.empreinte)).toBe(true);
  return n;
}

/** Destinataires et objets du dernier envoi réel, par adresse. */
function objetsEnvoyes(): Record<string, string> {
  const r: Record<string, string> = {};
  for (const [mails] of batchSend.mock.calls as Array<[Array<{ to: string; subject: string }>]>) {
    for (const m of mails) r[m.to] = m.subject;
  }
  return r;
}

beforeEach(() => {
  contacts.length = 0;
  for (const k of Object.keys(details)) delete details[k];
  db.exec('DELETE FROM coulisses_numeros; DELETE FROM coulisses_envois; DELETE FROM coulisses_bienvenue;');
  batchSend.mockReset().mockImplementation(async (mails: unknown[]) => ({
    data: { data: mails.map((_, i) => ({ id: `em_${i}` })) },
    error: null,
  }));
  process.env.COULISSES_EXCLUS = '';
  process.env.SONDAGE_OUVERTURE = '2026-10-12';
  process.env.SONDAGE_CLOTURE = '2026-12-06';
});

describe('envoyerNumero : envoi réel', () => {
  it('novembre : la bienvenue à chacun, une fois, dans sa langue (de → en) ; refus exclu', async () => {
    abonne('a', 'fr');
    abonne('b', 'de');
    abonne('c', 'nl', { mot_mensuel: 'non' });
    const n = preparer('2026-11', NOV);
    const r = await envoyerNumero(db, n, SITE, NOV);
    expect(r.erreurs).toEqual([]);
    expect(r.envoyes).toEqual({ 'fr-premier': 1, 'en-premier': 1 });
    expect(r.exclus.refus).toBe(1);
    expect(r.versionBienvenue).toBe(1);
    const mails = batchSend.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(mails.map((m) => m.to)).toEqual(['a@example.org', 'b@example.org']);
    expect(mails[0].from).toBe(COULISSES_FROM);
    expect(mails[0].replyTo).toBe('contact@brusselsgovernance.be');
    expect(J.lireNumero(db, n)!.etat).toBe('envoye');
  });

  it('refusé un autre jour que le premier jeudi du mois du rendez-vous (pas de rattrapage)', async () => {
    abonne('a');
    const n = preparer('2026-11', NOV);
    const r = await envoyerNumero(db, n, SITE, Date.parse('2026-11-06T07:00:00Z'));
    expect(batchSend).not.toHaveBeenCalled();
    expect(r.erreurs.join(' ')).toContain('premier jeudi');
    expect(J.lireNumero(db, n)!.etat).toBe('interrompu');
  });

  it('refusé si la bienvenue a changé après le verrou (contenu différent de l’essai)', async () => {
    abonne('a');
    const n = preparer('2026-11', NOV);
    J.enregistrerBienvenue(db, { ...B, fr: { ...B.fr, objet: 'Autre objet' } });
    const r = await envoyerNumero(db, n, SITE, NOV);
    expect(batchSend).not.toHaveBeenCalled();
    expect(r.erreurs.join(' ')).toContain('Refaire l’essai');
  });

  it('sondage clos entre l’essai et l’envoi : rien ne part (invitation périmée), un nouvel essai est exigé', async () => {
    abonne('a');
    const n = preparer('2026-11', NOV);
    process.env.SONDAGE_CLOTURE = '2026-11-01';
    const r = await envoyerNumero(db, n, SITE, NOV);
    expect(batchSend).not.toHaveBeenCalled();
    expect(r.erreurs.join(' ')).toContain('sondage');
  });

  it("une reprise n'envoie pas deux fois", async () => {
    abonne('a');
    const n = preparer('2026-11', NOV);
    await envoyerNumero(db, n, SITE, NOV);
    J.terminer(db, n, 'interrompu', {});
    expect(J.prendreVerrou(db, n, contenuDuRendezVous(db, n, NOV)!.empreinte)).toBe(true);
    const r = await envoyerNumero(db, n, SITE, NOV);
    expect(batchSend).toHaveBeenCalledTimes(1);
    expect(r.exclus.deja_envoye).toBe(1);
  });

  it('réponse perdue : marqué incertain, jamais renvoyé automatiquement', async () => {
    abonne('a');
    const n = preparer('2026-11', NOV);
    batchSend.mockResolvedValue({ data: null, error: { statusCode: null, name: 'application_error', message: 'réseau' } });
    const r = await envoyerNumero(db, n, SITE, NOV);
    expect(r.incertains).toBe(1);
    expect(J.compterJournal(db, n)).toEqual({ incertain: 1 });
    expect(J.prendreVerrou(db, n, contenuDuRendezVous(db, n, NOV)!.empreinte)).toBe(true);
    batchSend.mockClear();
    await envoyerNumero(db, n, SITE, NOV);
    expect(batchSend).not.toHaveBeenCalled();
  });

  it('erreur 5xx : issue inconnue, marqué incertain (jamais libéré ni renvoyé)', async () => {
    abonne('a');
    const n = preparer('2026-11', NOV);
    batchSend.mockResolvedValue({ data: null, error: { statusCode: 504, name: 'application_error', message: 'Gateway Timeout' } });
    const r = await envoyerNumero(db, n, SITE, NOV);
    expect(r.incertains).toBe(1);
    expect(r.refusesParResend).toBe(0);
  });

  it('exception pendant l’appel : incertain, pas de réservation orpheline', async () => {
    abonne('a');
    const n = preparer('2026-11', NOV);
    batchSend.mockRejectedValue(new Error('rendu impossible'));
    const r = await envoyerNumero(db, n, SITE, NOV);
    expect(r.incertains).toBe(1);
    expect(J.compterJournal(db, n)).toEqual({ incertain: 1 });
  });

  it('lot refusé (422) à cause d’une adresse : renvoi un par un, seule la fautive reste dehors, sans adresse au rapport', async () => {
    abonne('a');
    abonne('b');
    const n = preparer('2026-11', NOV);
    batchSend.mockImplementation(async (mails: Array<{ to: string }>) =>
      mails.length > 1 || mails[0].to === 'b@example.org'
        ? { data: null, error: { statusCode: 422, name: 'validation_error', message: 'Invalid `to` field: b@example.org' } }
        : { data: { data: [{ id: 'r1' }] }, error: null },
    );
    const r = await envoyerNumero(db, n, SITE, NOV);
    expect(r.refusesParResend).toBe(1);
    expect(r.envoyes).toEqual({ 'fr-premier': 1 });
    expect(J.compterJournal(db, n)).toEqual({ envoye: 1 });
    // Refus d'adresse définitif : avertissement, pas erreur ; le rendez-vous est envoyé.
    expect(r.erreurs).toEqual([]);
    expect(r.avertissements.join(' ')).not.toContain('@');
    expect(r.avertissements).toHaveLength(2);
    expect(J.lireNumero(db, n)!.etat).toBe('envoye');
  });

  it('clé d’idempotence par lot, propre au lancement ; battement après chaque lot', async () => {
    abonne('a');
    const n = preparer('2026-11', NOV);
    db.prepare('UPDATE coulisses_numeros SET verrou_le = 1 WHERE numero = ?').run(n);
    const avant = Date.now();
    await envoyerNumero(db, n, SITE, NOV);
    expect((batchSend.mock.calls[0][1] as { idempotencyKey: string }).idempotencyKey).toMatch(new RegExp(`^coulisses-${n}-[0-9a-z]+-a$`));
    expect(J.lireNumero(db, n)!.verrouLe ?? 0).toBeGreaterThanOrEqual(avant);
  });

  it('refuse sans COULISSES_EXCLUS, et un numéro non verrouillé', async () => {
    delete process.env.COULISSES_EXCLUS;
    abonne('a');
    const n = preparer('2026-11', NOV);
    const r = await envoyerNumero(db, n, SITE, NOV);
    expect(batchSend).not.toHaveBeenCalled();
    expect(r.erreurs.join(' ')).toContain('COULISSES_EXCLUS');
    await expect(envoyerNumero(db, 99, SITE, NOV)).rejects.toThrow('non verrouillé');
  });
});

describe('bienvenue une seule fois, éditions collectives (tableau du 3 novembre)', () => {
  it('A, B, C de novembre 2026 à février 2027', async () => {
    abonne('a', 'fr', {}, '2026-08-05 10:00:00.000+00'); // inscrit depuis trois mois
    abonne('b', 'fr', {}, '2026-10-21 10:00:00.000+00'); // quinze jours au 5/11
    const recu: Record<string, Record<string, string>> = {};
    const tour = async (mois: string, quand: number, edition: Partial<Textes>) => {
      batchSend.mockClear();
      const r = await envoyerNumero(db, preparer(mois, quand, edition), SITE, quand);
      expect(r.erreurs).toEqual([]);
      recu[mois] = objetsEnvoyes();
    };
    await tour('2026-11', NOV, {});
    abonne('c', 'fr', {}, '2026-11-13 18:00:00.000+00'); // après le 12/11
    await tour('2026-12', DEC, ED);
    await tour('2027-01', JAN, ED);
    await tour('2027-02', FEV, ED);

    const BV = B.fr.objet;
    const AC = ED.fr.objet;
    expect(recu['2026-11']).toEqual({ 'a@example.org': BV });
    expect(recu['2026-12']).toEqual({ 'a@example.org': AC, 'b@example.org': BV });
    expect(recu['2027-01']).toEqual({ 'a@example.org': AC, 'b@example.org': AC, 'c@example.org': BV });
    expect(recu['2027-02']).toEqual({ 'a@example.org': AC, 'b@example.org': AC, 'c@example.org': AC });
  });

  it('mois sans édition : les bienvenues partent quand même, les autres ne reçoivent rien', async () => {
    abonne('a');
    await envoyerNumero(db, preparer('2026-11', NOV), SITE, NOV);
    abonne('b', 'fr', {}, '2026-11-10 10:00:00.000+00');
    batchSend.mockClear();
    const r = await envoyerNumero(db, preparer('2026-12', DEC), SITE, DEC);
    expect(objetsEnvoyes()).toEqual({ 'b@example.org': B.fr.objet });
    expect(r.sansEdition).toBe(1);
  });

  it('parti puis revenu après la suppression de son contact : pas de deuxième bienvenue (empreinte)', async () => {
    abonne('a');
    await envoyerNumero(db, preparer('2026-11', NOV), SITE, NOV);
    contacts.length = 0;
    abonne('a2', 'fr', {}, '2026-11-08 10:00:00.000+00', 'a@example.org');
    batchSend.mockClear();
    await envoyerNumero(db, preparer('2026-12', DEC, ED), SITE, DEC);
    expect(objetsEnvoyes()).toEqual({ 'a@example.org': ED.fr.objet });
  });

  it("bienvenue de novembre (sans empreinte), désabonné puis contact supprimé et revenu : reconnu (empreinte complétée tant qu'il est dans Resend)", async () => {
    abonne('a');
    const n = preparer('2026-11', NOV);
    await envoyerNumero(db, n, SITE, NOV);
    db.prepare('UPDATE coulisses_envois SET empreinte = NULL').run(); // comme un envoi d'avant la séparation
    contacts[0].unsubscribed = true;
    await envoyerNumero(db, preparer('2026-12', DEC, ED), SITE, DEC); // il est encore dans Resend, désabonné
    contacts.length = 0;
    abonne('a-retour', 'fr', {}, '2026-12-10 10:00:00.000+00', 'a@example.org');
    batchSend.mockClear();
    await envoyerNumero(db, preparer('2027-01', JAN, ED), SITE, JAN);
    expect(objetsEnvoyes()).toEqual({ 'a@example.org': ED.fr.objet });
  });

  it('désabonné entre deux rendez-vous : rien', async () => {
    abonne('a');
    await envoyerNumero(db, preparer('2026-11', NOV), SITE, NOV);
    contacts[0].unsubscribed = true;
    batchSend.mockClear();
    const r = await envoyerNumero(db, preparer('2026-12', DEC, ED), SITE, DEC);
    expect(batchSend).not.toHaveBeenCalled();
    expect(r.exclus.desinscrit).toBe(1);
  });
});

describe('bloc sondage de la bienvenue', () => {
  const contenu = (ouvert: boolean) => ({ bienvenue: { version: 1, textes: B, creeLe: 0 }, sondageOuvert: ouvert, edition: {} });
  it('ouvert : le repère devient le bloc ; clos : le repère disparaît, le reste est identique', async () => {
    const ouvert = await render(construireMail({ email: 'a@example.org', langue: 'fr', variante: 'premier' }, contenu(true), 1, SITE).react);
    const clos = await render(construireMail({ email: 'a@example.org', langue: 'fr', variante: 'premier' }, contenu(false), 1, SITE).react);
    expect(ouvert).toContain('https://governance.brussels/fr/sondage');
    expect(clos).not.toContain('sondage</a>');
    for (const h of [ouvert, clos]) {
      expect(h).not.toContain('[sondage]');
      expect(h).toContain('Bonjour,');
      expect(h).toContain('Zoltán');
    }
  });

  it("anglais : pas de sondage en anglais, aucun bloc même ouvert", async () => {
    const en = await render(construireMail({ email: 'a@example.org', langue: 'en', variante: 'premier' }, contenu(true), 1, SITE).react);
    expect(en).not.toContain('sondage');
  });

  it("l'état du sondage est lu au moment de préparer le mail", () => {
    J.enregistrerBienvenue(db, B);
    const n = J.numeroDuMois(db, '2026-11', true)!;
    expect(contenuDuRendezVous(db, n, NOV)!.sondageOuvert).toBe(true);
    expect(contenuDuRendezVous(db, n, Date.parse('2026-12-07T09:00:00Z'))!.sondageOuvert).toBe(false);
  });
});

describe('envoyerEssai', () => {
  it("sans édition : la bienvenue en fr, nl, en et de→en, à l'administrateur seulement, et note l'essai", async () => {
    abonne('a');
    J.enregistrerBienvenue(db, B);
    const n = J.numeroDuMois(db, '2026-11', true)!;
    const r = await envoyerEssai(db, n, 'admin@example.net', SITE, NOV);
    expect(r.envoyes).toBe(4);
    const mails = batchSend.mock.calls[0][0] as Array<{ to: string; subject: string }>;
    expect(new Set(mails.map((m) => m.to))).toEqual(new Set(['admin@example.net']));
    expect(mails.map((m) => m.subject)).toContain('[Essai bienvenue de→en] Behind the scenes');
    expect(J.lireNumero(db, n)!.essaiEmpreinte).toBe(contenuDuRendezVous(db, n, NOV)!.empreinte);
  });

  it('avec édition : bienvenue et édition, huit mails', async () => {
    J.enregistrerBienvenue(db, B);
    const n = J.numeroDuMois(db, '2026-12', true)!;
    J.enregistrerTextes(db, n, ED);
    expect((await envoyerEssai(db, n, 'admin@example.net', SITE, NOV)).envoyes).toBe(8);
  });

  it('refusé : bienvenue absente, ou édition à moitié remplie', async () => {
    const n = J.numeroDuMois(db, '2026-12', true)!;
    await expect(envoyerEssai(db, n, 'admin@example.net', SITE, NOV)).rejects.toThrow('Bienvenue incomplète');
    J.enregistrerBienvenue(db, B);
    J.enregistrerTextes(db, n, { fr: ED.fr });
    await expect(envoyerEssai(db, n, 'admin@example.net', SITE, NOV)).rejects.toThrow('Édition incomplète');
    expect(batchSend).not.toHaveBeenCalled();
  });
});

describe('simuler', () => {
  it("compte bienvenues et éditions par langue, n'écrit rien et n'envoie rien", async () => {
    abonne('a', 'fr');
    abonne('b', 'de', {}, '2026-11-20 10:00:00.000+00');
    J.enregistrerBienvenue(db, B);
    const n = J.numeroDuMois(db, '2026-11', true)!;
    const s = await simuler(db, n, NOV);
    expect(s.bienvenues).toEqual({ fr: 1 });
    expect(s.exclus.recent).toBe(1);
    expect(batchSend).not.toHaveBeenCalled();
    expect(J.compterJournal(db, n)).toEqual({});
    expect(JSON.stringify(s)).not.toContain('@');
  });
});

describe('construireMail', () => {
  const contenu = { bienvenue: { version: 1, textes: B, creeLe: 0 }, sondageOuvert: false, edition: ED };

  it('bienvenue : P.-S. de refus et lien #coulisses ; en-tête one-click propre aux coulisses', async () => {
    const m = construireMail({ email: 'a@example.org', langue: 'fr', variante: 'premier' }, contenu, 1, SITE);
    const html = await render(m.react);
    expect(m.subject).toBe(B.fr.objet);
    expect(html).toContain('P.-S.');
    expect(html).toContain('#coulisses');
    expect(html).toContain('Gérer mes préférences');
    expect(m.headers['List-Unsubscribe']).toContain('/api/coulisses/one-click?token=');
  });

  it('édition : son objet, pas de P.-S., mais toujours le lien de pied de page', async () => {
    const m = construireMail({ email: 'a@example.org', langue: 'nl', variante: 'courant' }, contenu, 2, SITE);
    const html = await render(m.react);
    expect(m.subject).toBe(ED.nl.objet);
    expect(html).not.toContain('P.S.');
    expect(html).toContain('Mijn voorkeuren beheren');
  });

  it('UTM sur les liens du site : mois et genre du mail, « essai- » pour un essai ; pas sur le pied de page', async () => {
    const lien = { ...contenu, edition: { ...ED, fr: { ...ED.fr, corps: '<p><a href="https://governance.brussels/fr/soutenir">Soutenir</a></p>' } } };
    const vrai = await render(construireMail({ email: 'a@example.org', langue: 'fr', variante: 'courant' }, lien, 2, SITE, { mois: '2026-12' }).react);
    expect(vrai).toContain('/fr/soutenir?utm_source=bgm-coulisses&amp;utm_medium=email&amp;utm_campaign=2026-12&amp;utm_content=edition');
    expect(vrai).not.toMatch(/preferences[^"]*utm_/);
    const essai = await render(
      construireMail({ email: 'a@example.org', langue: 'fr', variante: 'courant' }, lien, 2, SITE, { essai: true, mois: '2026-12' }).react,
    );
    expect(essai).toContain('utm_content=essai-edition');
  });

  it('pas de version texte écrite à la main : Resend la tire du HTML', () => {
    expect('text' in construireMail({ email: 'a@example.org', langue: 'fr', variante: 'premier' }, contenu, 1, SITE)).toBe(false);
  });

  it('signature : LinkedIn et chaîne WhatsApp', async () => {
    const html = await render(construireMail({ email: 'a@example.org', langue: 'fr', variante: 'courant' }, contenu, 1, SITE).react);
    expect(html).toContain('https://www.linkedin.com/in/zoltan');
    expect(html).toContain('https://whatsapp.com/channel/');
  });

  it('corps HTML : intertitre, gras et lien stylés en ligne ; balises hors liste retirées', async () => {
    const edition = { ...ED, fr: { objet: 'x', corps: '<h2>Titre</h2><p><strong>Gras</strong> <a href="https://governance.brussels/fr/sondage">sondage</a></p><script>alert(1)</script><p><a href="javascript:alert(1)">piège</a></p>' } };
    const html = await render(construireMail({ email: 'a@example.org', langue: 'fr', variante: 'courant' }, { ...contenu, edition }, 1, SITE).react);
    expect(html).toMatch(/<h2 style="[^"]+">Titre<\/h2>/);
    expect(html).toContain('<strong>Gras</strong>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('javascript:');
  });

  it("aperçu : celui de l'admin s'il existe, sinon le début du texte", () => {
    expect(texteApercu('<p>Bonjour,</p><p>Texte.</p>')).toBe('Bonjour, Texte.');
    expect(texteApercu(`<p>${'mot '.repeat(60)}</p>`)).toHaveLength(150);
    expect(texteApercu('<p>x</p>', 'Choisi')).toBe('Choisi');
  });

  it('abonné en allemand : version anglaise avec la note en allemand en tête ; les autres sans note', async () => {
    const de = await render(construireMail({ email: 'a@example.org', langue: 'en', variante: 'courant', localeAbonne: 'de' }, contenu, 1, SITE).react);
    expect(de).toContain('nicht auf Deutsch schreiben kann');
    const en = await render(construireMail({ email: 'a@example.org', langue: 'en', variante: 'courant', localeAbonne: 'en' }, contenu, 1, SITE).react);
    expect(en).not.toContain('Deutsch');
  });
});

describe('masquerAdresses', () => {
  it('remplace toute adresse, garde le reste', () => {
    expect(masquerAdresses('Invalid `to` field: x.y+z@ex-ample.org (strict)')).toBe('Invalid `to` field: [adresse] (strict)');
    expect(masquerAdresses('<a@b.be>, c@d.be')).toBe('<[adresse]>, [adresse]');
  });
});
