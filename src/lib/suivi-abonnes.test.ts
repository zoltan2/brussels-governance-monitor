// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { createDb } from './db';
import { effacerDesabonnement, noterDesabonnement } from './desabonnements';
import {
  appliquerReprise,
  compterEvenement,
  lireSuiviAbonnes,
  moisBruxelles,
  repriseFaite,
} from './suivi-abonnes';

const ms = (date: string) => Date.parse(date);
const OCTOBRE = ms('2026-10-30T12:00:00Z');

let db: DatabaseSync;

/** Fixe le début du suivi : la migration le date de l'heure réelle. */
function debutLe(date: string, stock = 0) {
  db.prepare('UPDATE abonnes_suivi SET debut = ?, stock_desabonnements = ?').run(ms(date), stock);
}

beforeEach(() => {
  db = createDb(':memory:');
  debutLe('2026-10-30T10:00:00Z');
});

function moisDe(cle: string) {
  return lireSuiviAbonnes(db, OCTOBRE).mois.find((m) => m.mois === cle);
}

describe('moisBruxelles', () => {
  it('suit le fuseau de Bruxelles, pas UTC', () => {
    expect(moisBruxelles(ms('2026-10-31T23:30:00Z'))).toBe('2026-11');
    expect(moisBruxelles(ms('2026-07-31T21:30:00Z'))).toBe('2026-07');
  });
});

describe('migration', () => {
  it('garde dans le stock les personnes déjà désinscrites, sans leur donner de mois', () => {
    const chemin = join(mkdtempSync(join(tmpdir(), 'bgm-suivi-')), 'a.db');
    const base = createDb(chemin);
    base.exec('DELETE FROM abonnes_suivi');
    base.exec(
      "INSERT INTO desabonnements (empreinte, desabonne_le) VALUES ('a', 1), ('b', 2)",
    );
    base.close();

    const rouverte = createDb(chemin);
    const suivi = lireSuiviAbonnes(rouverte);
    expect(suivi.desabonnementsTotal).toBe(2);
    expect(suivi.desabonnementsCeMois).toBe(0);
    rouverte.close();
  });

  it('ne réécrit ni le début ni le stock à un redémarrage', () => {
    const chemin = join(mkdtempSync(join(tmpdir(), 'bgm-suivi-')), 'b.db');
    const base = createDb(chemin);
    base.prepare('UPDATE abonnes_suivi SET debut = 42, stock_desabonnements = 8').run();
    base.close();
    const rouverte = createDb(chemin);
    const suivi = lireSuiviAbonnes(rouverte);
    expect(suivi.debut).toBe(42);
    expect(suivi.desabonnementsTotal).toBe(8);
    rouverte.close();
  });
});

describe('désabonnements et retours', () => {
  it('un double désabonnement compte une seule fois', () => {
    noterDesabonnement(db, 'e', OCTOBRE);
    noterDesabonnement(db, 'e', OCTOBRE);
    expect(lireSuiviAbonnes(db, OCTOBRE).desabonnementsCeMois).toBe(1);
  });

  it('additionne le stock et les départs comptés', () => {
    debutLe('2026-10-30T10:00:00Z', 8);
    noterDesabonnement(db, 'e', OCTOBRE);
    const suivi = lireSuiviAbonnes(db, OCTOBRE);
    expect(suivi.desabonnementsTotal).toBe(9);
    expect(suivi.desabonnementsCeMois).toBe(1);
  });

  it('un retour efface la ligne sans faire baisser le total des départs', () => {
    noterDesabonnement(db, 'e', OCTOBRE);
    effacerDesabonnement(db, 'e');
    expect(lireSuiviAbonnes(db, OCTOBRE).desabonnementsTotal).toBe(1);
  });

  it('un compteur en panne ne lève pas', () => {
    db.exec('DROP TABLE abonnes_mois');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => compterEvenement(db, 'nouveaux')).not.toThrow();
    vi.restoreAllMocks();
  });
});

describe('reprise', () => {
  it('compte par mois de Bruxelles et lit le format « +00 » de Resend', () => {
    appliquerReprise(db, [
      { email: 'a@example.org', createdAt: '2026-03-10T10:00:00.000Z' },
      { email: 'b@example.org', createdAt: '2026-03-31 23:30:00.000+00' },
      { email: 'c@example.org', createdAt: '2026-05-02T10:00:00.000Z' },
    ]);
    expect(moisDe('2026-03')?.valeur).toBe(1);
    expect(moisDe('2026-04')?.valeur).toBe(1);
    expect(moisDe('2026-05')?.valeur).toBe(1);
    expect(repriseFaite(db)).toBe(true);
  });

  it('exclut la sonde et les contacts déjà comptés en direct', () => {
    appliquerReprise(db, [
      { email: 'healthcheck-1761800000000@governance.brussels', createdAt: '2026-03-10T10:00:00Z' },
      { email: 'apres@example.org', createdAt: '2026-10-30T11:00:00Z' },
    ]);
    expect(moisDe('2026-03')?.valeur).toBeNull();
    expect(moisDe('2026-10')?.valeur).toBe(0);
  });

  it('une date illisible refuse tout, sans écrire', () => {
    expect(() =>
      appliquerReprise(db, [
        { email: 'a@example.org', createdAt: '2026-03-10T10:00:00Z' },
        { email: 'b@example.org', createdAt: 'hier' },
      ]),
    ).toThrow();
    expect(repriseFaite(db)).toBe(false);
    expect(moisDe('2026-03')?.valeur).toBeNull();
  });

  it('additionne reconstitué et mesuré le mois du début, sans se chevaucher', () => {
    compterEvenement(db, 'nouveaux', OCTOBRE);
    appliquerReprise(db, [{ email: 'a@example.org', createdAt: '2026-10-01T10:00:00Z' }]);
    expect(moisDe('2026-10')?.valeur).toBe(2);
  });
});

describe('les 12 mois', () => {
  it('finit au mois en cours et distingue les statuts', () => {
    appliquerReprise(db, [{ email: 'a@example.org', createdAt: '2026-03-10T10:00:00Z' }]);
    const { mois } = lireSuiviAbonnes(db, OCTOBRE);
    expect(mois).toHaveLength(12);
    expect(mois[0].mois).toBe('2025-11');
    expect(mois[11]).toEqual({ mois: '2026-10', valeur: 0, statut: 'en-cours' });
    expect(moisDe('2026-03')?.statut).toBe('reconstitue');
  });

  it('laisse vides les mois avant le premier contact, garde à zéro ceux d’après', () => {
    appliquerReprise(db, [{ email: 'a@example.org', createdAt: '2026-03-10T10:00:00Z' }]);
    expect(moisDe('2026-02')?.valeur).toBeNull();
    expect(moisDe('2026-04')?.valeur).toBe(0);
  });

  it('passe janvier à décembre de l’année précédente', () => {
    const { mois } = lireSuiviAbonnes(db, ms('2027-01-15T12:00:00Z'));
    expect(mois[10].mois).toBe('2026-12');
  });

  it('sans reprise, commence au mois du début du suivi', () => {
    expect(moisDe('2026-09')?.valeur).toBeNull();
    expect(moisDe('2026-10')?.valeur).toBe(0);
  });
});
