// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDb } from '@/lib/db';
import { purgerSondage } from './purge';
import { ajouterEntretien, creerReponse, majReponse, tousLesEntretiens } from './store';

const TEMOIN = 'temoin-purge-7f3a@example.org';

function remplir(db: ReturnType<typeof createDb>) {
  for (let i = 0; i < 40; i++) {
    ajouterEntretien(db, { email: `${i}-${TEMOIN}`, langue: 'fr', jour: '2026-11-20' });
  }
  creerReponse(db, { session: 'a'.repeat(22), langue: 'nl', version: 'v3', jour: '2026-11-20', pilote: false });
  majReponse(db, {
    session: 'a'.repeat(22),
    reponses: { q1: { valeur: 'souvent' } },
    etape: 'fin',
    duree_ms: 60_000,
    jour: '2026-11-20',
    termine: true,
  });
}

function nbReponses(db: ReturnType<typeof createDb>): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM sondage_reponses').get() as { n: number }).n;
}

const dossiers: string[] = [];
afterEach(() => {
  for (const d of dossiers.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe('purgerSondage', () => {
  it('vide les entretiens et garde les réponses avant le 06/12/2027', () => {
    const db = createDb(':memory:');
    remplir(db);
    const bilan = purgerSondage(db, new Date('2026-12-06T10:00:00Z'));
    expect(bilan).toEqual({ entretiensSupprimes: 40, reponsesSupprimees: 0, reponsesEchues: false });
    expect(tousLesEntretiens(db)).toEqual([]);
    expect(nbReponses(db)).toBe(1);
  });

  it('le 06/12/2027 compris, les réponses restent ; le lendemain, elles partent', () => {
    const db = createDb(':memory:');
    remplir(db);
    purgerSondage(db, new Date('2027-12-06T20:00:00Z'));
    expect(nbReponses(db)).toBe(1);
    const bilan = purgerSondage(db, new Date('2027-12-07T08:00:00Z'));
    expect(bilan.reponsesSupprimees).toBe(1);
    expect(nbReponses(db)).toBe(0);
  });

  it('appelle VACUUM après la suppression', () => {
    const db = createDb(':memory:');
    remplir(db);
    const exec = vi.spyOn(db, 'exec');
    purgerSondage(db, new Date('2026-12-06T10:00:00Z'));
    const appels = exec.mock.calls.map((c) => c[0]);
    expect(appels).toContain('VACUUM');
    expect(appels.indexOf('VACUUM')).toBeGreaterThan(appels.indexOf('COMMIT'));
  });

  it('aucune adresse ne reste lisible dans les fichiers de la base (base et journal WAL)', () => {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'bgm-sondage-purge-'));
    dossiers.push(dossier);
    const fichier = path.join(dossier, 'bgm.db');
    const db = createDb(fichier);
    remplir(db);
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    const lire = () =>
      ['', '-wal']
        .map((s) => (fs.existsSync(fichier + s) ? fs.readFileSync(fichier + s).toString('latin1') : ''))
        .join('');
    // Témoin : avant la purge, l'adresse est bien dans le fichier.
    expect(lire()).toContain(TEMOIN);
    purgerSondage(db, new Date('2026-12-06T10:00:00Z'));
    expect(lire()).not.toContain(TEMOIN);
    db.close();
  });
});
