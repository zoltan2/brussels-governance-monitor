// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';

process.env.DB_PATH = ':memory:';
const { getDb, migrerCoulisses } = await import('@/lib/db');
const J = await import('./journal');
const db = getDb()!;

const T = {
  fr: { objet: 'Bonjour', corps: '<p>Texte fr</p>' },
  nl: { objet: 'Hallo', corps: '<p>Tekst nl</p>' },
  en: { objet: 'Hello', corps: '<p>Text en</p>' },
};
const E = 'empreinte-essai';

beforeEach(() => {
  db.exec('DELETE FROM coulisses_numeros; DELETE FROM coulisses_envois; DELETE FROM coulisses_bienvenue;');
});

describe('journal des coulisses : verrou et essai', () => {
  it("refuse le verrou sans essai, puis l'accorde une seule fois", () => {
    J.enregistrerTextes(db, 1, T);
    expect(J.prendreVerrou(db, 1, E)).toBe(false);
    J.noterEssai(db, 1, E);
    expect(J.prendreVerrou(db, 1, E)).toBe(true);
    expect(J.prendreVerrou(db, 1, E)).toBe(false);
  });

  it("un contenu différent de celui de l'essai refuse le verrou", () => {
    J.enregistrerTextes(db, 1, T);
    J.noterEssai(db, 1, E);
    expect(J.prendreVerrou(db, 1, 'autre')).toBe(false);
  });

  it("enregistrer l'édition périme l'essai ; figée une fois l'envoi commencé", () => {
    J.enregistrerTextes(db, 1, T);
    J.noterEssai(db, 1, E);
    J.enregistrerTextes(db, 1, { ...T, nl: { objet: 'Hallo', corps: '<p>verbeterd</p>' } });
    expect(J.prendreVerrou(db, 1, E)).toBe(false);
    J.noterEssai(db, 1, E);
    J.prendreVerrou(db, 1, E);
    expect(J.enregistrerTextes(db, 1, T)).toBe('verrouille');
  });

  it("l'empreinte change avec l'édition, la version de bienvenue et l'état du sondage", () => {
    const b = { version: 1, textes: T, creeLe: 0 };
    const base = J.empreinteEnvoi({ edition: {}, bienvenue: b, sondageOuvert: true });
    expect(J.empreinteEnvoi({ edition: {}, bienvenue: b, sondageOuvert: false })).not.toBe(base);
    expect(J.empreinteEnvoi({ edition: {}, bienvenue: { ...b, version: 2 }, sondageOuvert: true })).not.toBe(base);
    expect(J.empreinteEnvoi({ edition: T, bienvenue: b, sondageOuvert: true })).not.toBe(base);
    // Une édition aux textes vides vaut une édition absente.
    const vide = { fr: { objet: '', corps: '<p></p>' }, nl: { objet: '', corps: '' }, en: { objet: '', corps: '' } };
    expect(J.empreinteEnvoi({ edition: vide, bienvenue: b, sondageOuvert: true })).toBe(base);
  });

  it('une reprise après interruption reprend le verrou ; débloque après 10 minutes sans battement', () => {
    J.enregistrerTextes(db, 1, T);
    J.noterEssai(db, 1, E);
    J.prendreVerrou(db, 1, E, 1_000_000);
    J.reserver(db, 1, { id: 'a', langue: 'fr', variante: 'premier' });
    J.battement(db, 1, 1_000_000 + 8 * 60_000);
    expect(J.debloquer(db, 1, 1_000_000 + 11 * 60_000)).toBe(false);
    expect(J.debloquer(db, 1, 1_000_000 + 19 * 60_000)).toBe(true);
    expect(J.lireNumero(db, 1)!.etat).toBe('interrompu');
    expect(J.compterJournal(db, 1)).toEqual({ incertain: 1 });
    expect(J.prendreVerrou(db, 1, E)).toBe(true);
    J.terminer(db, 1, 'envoye', {});
    expect(J.prendreVerrou(db, 1, E)).toBe(false);
  });
});

describe('journal des coulisses : réservations', () => {
  it('une réservation ne se prend qu’une fois ; une seule ligne par personne et par rendez-vous', () => {
    expect(J.reserver(db, 1, { id: 'c1', langue: 'fr', variante: 'premier' }, 3)).toBe(true);
    expect(J.reserver(db, 1, { id: 'c1', langue: 'fr', variante: 'courant' }, 3)).toBe(false);
    const r = db.prepare('SELECT variante, version_bienvenue FROM coulisses_envois').all();
    expect(r).toEqual([{ variante: 'premier', version_bienvenue: 3 }]);
  });

  it('un refus explicite libère la réservation, une issue inconnue la garde', () => {
    J.reserver(db, 1, { id: 'a', langue: 'fr', variante: 'premier' });
    J.reserver(db, 1, { id: 'b', langue: 'fr', variante: 'premier' });
    J.annulerReservation(db, 1, 'a');
    J.marquerIncertain(db, 1, 'b');
    expect(J.dejaAuJournal(db, 1)).toEqual(new Set(['b']));
    expect(J.compterJournal(db, 1)).toEqual({ incertain: 1 });
  });

  it("bienvenue reçue : toute ligne d'un AUTRE rendez-vous compte (envoyée, incertaine), par id ou empreinte", () => {
    J.reserver(db, 1, { id: 'a', langue: 'fr', variante: 'premier', empreinte: 'ea' });
    J.marquerEnvoye(db, 1, 'a', 'em_1');
    J.reserver(db, 1, { id: 'b', langue: 'fr', variante: 'premier' });
    J.marquerIncertain(db, 1, 'b');
    const r = J.bienvenueRecue(db, 2);
    expect(r.ids).toEqual(new Set(['a', 'b']));
    expect(r.empreintes).toEqual(new Set(['ea']));
    expect(J.bienvenueRecue(db, 1).ids).toEqual(new Set());
  });

  it("complète l'empreinte des lignes qui n'en ont pas, sans écraser les autres", () => {
    J.reserver(db, 1, { id: 'a', langue: 'fr', variante: 'premier' });
    J.reserver(db, 1, { id: 'b', langue: 'fr', variante: 'premier', empreinte: 'eb' });
    J.completerEmpreintes(db, [{ id: 'a', empreinte: 'ea' }, { id: 'b', empreinte: 'autre' }]);
    expect(J.bienvenueRecue(db, 2).empreintes).toEqual(new Set(['ea', 'eb']));
  });
});

describe('journal des coulisses : bienvenue et rendez-vous', () => {
  it('bienvenue : version 1, inchangée si identique, nouvelle version sinon', () => {
    expect(J.lireBienvenue(db)).toBeNull();
    expect(J.enregistrerBienvenue(db, T)).toBe(1);
    expect(J.enregistrerBienvenue(db, T)).toBe(1);
    expect(J.enregistrerBienvenue(db, { ...T, fr: { ...T.fr, objet: 'Autre' } })).toBe(2);
    expect(J.lireBienvenue(db)!.textes.fr.objet).toBe('Autre');
    expect((db.prepare('SELECT COUNT(*) AS n FROM coulisses_bienvenue').get() as { n: number }).n).toBe(2);
  });

  it('un rendez-vous par mois : créé une fois, retrouvé ensuite', () => {
    expect(J.numeroDuMois(db, '2026-12')).toBeNull();
    const n = J.numeroDuMois(db, '2026-12', true)!;
    expect(J.numeroDuMois(db, '2026-12', true)).toBe(n);
    expect(J.numeroDuMois(db, '2027-01', true)).toBe(n + 1);
    expect(J.lireNumero(db, n)!.mois).toBe('2026-12');
    expect(J.editionVide(J.lireNumero(db, n)!.textes)).toBe(true);
  });

  it('édition : vide ou complète, jamais à moitié', () => {
    expect(J.editionValide({})).toBe(true);
    expect(J.editionValide(T)).toBe(true);
    expect(J.editionValide({ fr: T.fr })).toBe(false);
    expect(J.textesComplets({ ...T, en: { objet: ' ', corps: 'x' } })).toBe(false);
  });

  it('purge : lignes de plus de 24 mois des personnes parties seulement', () => {
    const vieux = Date.now() - 800 * 86_400_000;
    J.reserver(db, 1, { id: 'parti', langue: 'fr', variante: 'premier', empreinte: 'ep' }, 1, vieux);
    J.reserver(db, 1, { id: 'actif', langue: 'fr', variante: 'premier', empreinte: 'ex' }, 1, vieux);
    J.reserver(db, 1, { id: 'revenu', langue: 'fr', variante: 'premier', empreinte: 'er' }, 1, vieux);
    J.reserver(db, 1, { id: 'recent', langue: 'fr', variante: 'premier' }, 1);
    J.reserver(db, 1, { id: 'parti-recemment', langue: 'fr', variante: 'premier', empreinte: 'eq' }, 1, vieux);
    db.exec('DELETE FROM desabonnements');
    db.prepare('INSERT INTO desabonnements (empreinte, desabonne_le) VALUES (?, ?)').run('eq', Date.now());
    const n = J.purgerJournal(db, { ids: new Set(['actif']), empreintes: new Set(['er']) });
    expect(n).toBe(1);
    // « parti-recemment » : ligne ancienne, mais départ de moins de 24 mois (registre).
    expect(J.dejaAuJournal(db, 1)).toEqual(new Set(['actif', 'revenu', 'recent', 'parti-recemment']));
  });
});

describe('migration : rendez-vous de novembre écrit avant la séparation', () => {
  function baseAncienne(): DatabaseSync {
    const b = new DatabaseSync(':memory:');
    b.exec(`CREATE TABLE coulisses_numeros (numero INTEGER PRIMARY KEY, textes TEXT NOT NULL, modifie_le INTEGER NOT NULL,
      essai_empreinte TEXT, essai_le INTEGER, etat TEXT NOT NULL DEFAULT 'brouillon', verrou_le INTEGER, rapport TEXT);
      CREATE TABLE coulisses_envois (numero INTEGER NOT NULL, contact_id TEXT NOT NULL, langue TEXT NOT NULL, variante TEXT NOT NULL,
      etat TEXT NOT NULL, resend_id TEXT, le INTEGER NOT NULL, PRIMARY KEY (numero, contact_id));
      CREATE TABLE coulisses_bienvenue (version INTEGER PRIMARY KEY, textes TEXT NOT NULL, cree_le INTEGER NOT NULL);`);
    b.prepare(`INSERT INTO coulisses_numeros (numero, textes, modifie_le, etat) VALUES (1, ?, 42, 'envoye')`).run(JSON.stringify(T));
    b.prepare(`INSERT INTO coulisses_envois VALUES (1, 'a', 'fr', 'premier', 'envoye', 'em', 43)`).run();
    return b;
  }

  it("son texte devient la bienvenue v1, son édition est vide, ses envois sont des bienvenues v1 ; une seule fois", () => {
    const b = baseAncienne();
    migrerCoulisses(b);
    migrerCoulisses(b);
    expect(J.lireBienvenue(b)).toEqual({ version: 1, textes: T, creeLe: 42 });
    const n = J.lireNumero(b, 1)!;
    expect(n.mois).toBe('2026-11');
    expect(J.editionVide(n.textes)).toBe(true);
    expect(n.etat).toBe('envoye');
    expect(b.prepare('SELECT version_bienvenue, empreinte FROM coulisses_envois').all()).toEqual([{ version_bienvenue: 1, empreinte: null }]);
    expect((b.prepare('SELECT COUNT(*) AS n FROM coulisses_bienvenue').get() as { n: number }).n).toBe(1);
    // Décembre : la personne de novembre est reconnue.
    expect(J.bienvenueRecue(b, J.numeroDuMois(b, '2026-12', true)!).ids).toEqual(new Set(['a']));
  });

  it('base neuve : rien à reprendre', () => {
    const b = new DatabaseSync(':memory:');
    b.exec(`CREATE TABLE coulisses_numeros (numero INTEGER PRIMARY KEY, textes TEXT NOT NULL, modifie_le INTEGER NOT NULL,
      essai_empreinte TEXT, essai_le INTEGER, etat TEXT NOT NULL DEFAULT 'brouillon', verrou_le INTEGER, rapport TEXT);
      CREATE TABLE coulisses_envois (numero INTEGER NOT NULL, contact_id TEXT NOT NULL, langue TEXT NOT NULL, variante TEXT NOT NULL,
      etat TEXT NOT NULL, resend_id TEXT, le INTEGER NOT NULL, PRIMARY KEY (numero, contact_id));
      CREATE TABLE coulisses_bienvenue (version INTEGER PRIMARY KEY, textes TEXT NOT NULL, cree_le INTEGER NOT NULL);`);
    migrerCoulisses(b);
    expect(J.lireBienvenue(b)).toBeNull();
  });
});
