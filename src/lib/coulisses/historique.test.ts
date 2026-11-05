// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, beforeEach } from 'vitest';

process.env.DB_PATH = ':memory:';
const { getDb } = await import('@/lib/db');
const { lireHistorique, FENETRE_REFUS_MS } = await import('./historique');
const db = getDb()!;

const JOUR = 86_400_000;
const NOV = Date.parse('2026-11-05T06:19:30.036Z');
const DEC = Date.parse('2026-12-03T06:00:00.000Z');

// Rapport réel du n° 1 (ancienne forme, avant la séparation bienvenue / édition).
const RAPPORT_1 = {
  numero: 1,
  debut: '2026-11-05T06:19:30.036Z',
  fin: '2026-11-05T06:20:51.307Z',
  envoyes: { 'fr-premier': 94, 'nl-premier': 13, 'en-premier': 7 },
  exclus: { desinscrit: 0, refus: 0, langue: 0, date: 0, recent: 16, interne: 1, deja_envoye: 0 },
  refusesParResend: 0,
  incertains: 0,
  erreurs: [],
};
const RAPPORT_2 = {
  numero: 2,
  mois: '2026-12',
  versionBienvenue: 1,
  sondageOuvert: true,
  debut: '2026-12-03T06:00:00.000Z',
  fin: '2026-12-03T06:01:30.000Z',
  envoyes: { 'fr-premier': 10, 'nl-premier': 2, 'fr-courant': 85, 'nl-courant': 16 },
  exclus: { desinscrit: 0, refus: 3, langue: 0, date: 0, recent: 9, interne: 1, deja_envoye: 0 },
  sansEdition: 0,
  refusesParResend: 1,
  incertains: 0,
  purges: 0,
  avertissements: [],
  erreurs: [],
};

function numero(n: number, mois: string, rapport: unknown) {
  db.prepare(
    `INSERT INTO coulisses_numeros (numero, textes, modifie_le, etat, rapport, mois) VALUES (?, '{}', 0, 'envoye', ?, ?)`,
  ).run(n, JSON.stringify(rapport), mois);
}
function envoi(n: number, contact: string, empreinte: string | null, variante: string, le: number, version: number | null) {
  db.prepare(
    `INSERT INTO coulisses_envois (numero, contact_id, langue, variante, etat, le, empreinte, version_bienvenue)
     VALUES (?, ?, 'fr', ?, 'envoye', ?, ?, ?)`,
  ).run(n, contact, variante, le, empreinte, version);
}
function choix(empreinte: string, sens: 'refus' | 'reprise', le: number) {
  db.prepare(`INSERT INTO coulisses_refus (empreinte, sens, source, le) VALUES (?, ?, 'one-click', ?)`).run(
    empreinte,
    sens,
    le,
  );
}

beforeEach(() => {
  db.exec(
    'DELETE FROM coulisses_numeros; DELETE FROM coulisses_envois; DELETE FROM coulisses_refus; DELETE FROM resend_evenements;',
  );
});

describe('lireHistorique', () => {
  it('lit le rapport figé du n° 1 : abonnés, bienvenues v1, pas d’édition', () => {
    numero(1, '2026-11', RAPPORT_1);
    const [l] = lireHistorique(db).rendezVous;
    expect(l).toMatchObject({
      numero: 1,
      mois: '2026-11',
      abonnes: 131,
      bienvenues: 114,
      edition: null,
      versionBienvenue: 1,
      tropRecents: 16,
      incidents: 0,
    });
  });

  it('sépare bienvenues et édition dans un rapport d’après #800', () => {
    numero(1, '2026-11', RAPPORT_1);
    numero(2, '2026-12', RAPPORT_2);
    const [, d] = lireHistorique(db).rendezVous;
    expect(d).toMatchObject({ bienvenues: 12, edition: 101, versionBienvenue: 1, abonnes: 126, incidents: 1 });
  });

  it('cumule la bienvenue v1 sur les rendez-vous, avec le détail par mois', () => {
    numero(1, '2026-11', RAPPORT_1);
    numero(2, '2026-12', RAPPORT_2);
    const [v1] = lireHistorique(db).versions;
    expect(v1).toMatchObject({ version: 1, depuis: '2026-11', recuePar: 126 });
    expect(v1.parMois).toEqual([
      { mois: '2026-11', n: 114 },
      { mois: '2026-12', n: 12 },
    ]);
  });

  it('rattache un refus au dernier mail reçu dans les 30 jours, à la bienvenue s’il en était une', () => {
    numero(1, '2026-11', RAPPORT_1);
    numero(2, '2026-12', RAPPORT_2);
    envoi(1, 'c1', 'e1', 'premier', NOV, 1);
    envoi(2, 'c1', 'e1', 'courant', DEC, null);
    envoi(1, 'c2', 'e2', 'premier', NOV, 1);
    choix('e1', 'refus', DEC + 2 * JOUR); // après l'édition de décembre
    choix('e2', 'refus', NOV + 3 * JOUR); // après la bienvenue de novembre
    const h = lireHistorique(db);
    expect(h.rendezVous.map((l) => l.refus)).toEqual([1, 1]);
    expect(h.versions[0].refus).toBe(1);
    expect(h.refusNonRattaches).toBe(0);
  });

  it('un refus plus de 30 jours après le dernier mail, ou sans envoi connu, n’est pas rattaché', () => {
    numero(1, '2026-11', RAPPORT_1);
    envoi(1, 'c1', 'e1', 'premier', NOV, 1);
    choix('e1', 'refus', NOV + FENETRE_REFUS_MS + JOUR);
    choix('inconnue', 'refus', NOV + JOUR);
    const h = lireHistorique(db);
    expect(h.rendezVous[0].refus).toBe(0);
    expect(h.refusNonRattaches).toBe(2);
  });

  it('compte les réactivations et les envois encore sans empreinte', () => {
    numero(1, '2026-11', RAPPORT_1);
    envoi(1, 'c1', null, 'premier', NOV, 1);
    choix('e9', 'refus', NOV);
    choix('e9', 'reprise', NOV + JOUR);
    const h = lireHistorique(db);
    expect(h.reactivations).toBe(1);
    expect(h.envoisSansEmpreinte).toBe(1);
  });

  it('range rebonds et plaintes des coulisses dans le rendez-vous en cours à leur réception', () => {
    numero(1, '2026-11', RAPPORT_1);
    numero(2, '2026-12', RAPPORT_2);
    const ev = db.prepare('INSERT INTO resend_evenements (event_id, type, envoi, recu_le) VALUES (?, ?, ?, ?)');
    ev.run('a', 'email.bounced', 'coulisses', NOV + JOUR);
    ev.run('b', 'email.complained', 'coulisses', DEC + JOUR);
    ev.run('c', 'email.bounced', 'digest', NOV + JOUR);
    const [n, d] = lireHistorique(db).rendezVous;
    expect([n.rebonds, n.plaintes, d.rebonds, d.plaintes]).toEqual([1, 0, 0, 1]);
  });

  it('ignore un rendez-vous en brouillon et un rapport illisible', () => {
    numero(1, '2026-11', RAPPORT_1);
    db.prepare(`INSERT INTO coulisses_numeros (numero, textes, modifie_le, etat, mois) VALUES (2, '{}', 0, 'brouillon', '2026-12')`).run();
    db.prepare(`INSERT INTO coulisses_numeros (numero, textes, modifie_le, etat, rapport, mois) VALUES (3, '{}', 0, 'envoye', 'pas du json', '2027-01')`).run();
    expect(lireHistorique(db).rendezVous.map((l) => l.numero)).toEqual([1]);
  });
});
