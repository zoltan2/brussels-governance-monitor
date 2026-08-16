// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { createDb } from '@/lib/db';
import { runMigrations } from './migrate';
import {
  schemaState, EXPECTED_SCHEMA_VERSION, IDENTITY_SCHEMA_VERSION,
} from './schema-version';

const DIR = join(process.cwd(), 'src/lib/bsides/migrations');

describe('createDb', () => {
  it('applique réellement les clés étrangères', () => {
    const db = createDb(':memory:');
    db.exec('CREATE TABLE parent (id TEXT PRIMARY KEY)');
    db.exec(
      'CREATE TABLE enfant (id TEXT PRIMARY KEY, parent_id TEXT REFERENCES parent(id))',
    );
    expect(() =>
      db.prepare('INSERT INTO enfant (id, parent_id) VALUES (?, ?)').run('e1', 'absent'),
    ).toThrow();
    db.close();
  });

  it('ne crée plus aucune table lui-même', () => {
    const db = createDb(':memory:');
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all();
    expect(tables).toEqual([]);
    db.close();
  });
});

describe('schemaState', () => {
  it('signale une base en retard sans lever', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(
      'CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL, checksum TEXT NOT NULL)',
    );
    db.prepare(
      'INSERT INTO schema_migrations VALUES (?, ?, ?)',
    ).run(1, 0, 'x');
    const state = schemaState(db);
    expect(state.current).toBe(1);
    expect(state.expected).toBe(EXPECTED_SCHEMA_VERSION);
    // Version 1 : ni les tables d'identité (migration 002) ni le module
    // (EXPECTED_SCHEMA_VERSION) ne sont là.
    expect(state.identityReady).toBe(false);
    expect(state.moduleReady).toBe(false);
    db.close();
  });

  it('rend les deux barres fausses, jamais une exception, quand la base est absente', () => {
    expect(schemaState(null)).toEqual({
      current: 0,
      expected: EXPECTED_SCHEMA_VERSION,
      identityReady: false,
      moduleReady: false,
    });
  });

  // LE CŒUR du correctif Sprint 2 (revue adverse du plan, 2026-08-15 bis) :
  // `authorizeCredentials` (src/auth.ts) s'appuie sur `identityReady`, jamais
  // sur `moduleReady`. Ce test-ci prouve, au niveau de `schemaState` et avec
  // les VRAIS numéros du scénario redouté, que les deux barres divergent
  // exactement comme prévu : une base migrée jusqu'à la version 4 (tout le
  // contenu réel du dépôt aujourd'hui) avec un code qui, demain, en
  // attendrait 5 (une migration 005 qui ferait grimper
  // EXPECTED_SCHEMA_VERSION — injecté ici via le second paramètre de
  // `schemaState`, pour ne pas avoir à attendre qu'un vrai fichier 005
  // existe) doit avoir `identityReady = true` (la 002 est largement
  // derrière) et `moduleReady = false` (la 005 n'a pas tourné).
  //
  // Ce qui ferait rougir ce test : que quelqu'un fasse recalculer
  // `identityReady` à partir de `expected`/`EXPECTED_SCHEMA_VERSION` au lieu
  // de `IDENTITY_SCHEMA_VERSION` — c'est-à-dire remette, sous un nom
  // différent, la même barre haute pour les deux usages. `identityReady`
  // doit rester vrai ici quelle que soit la valeur de `expected`.
  it('base à la version 4, code qui en attend 5 : identité prête, module pas prêt', () => {
    const db = createDb(':memory:');
    runMigrations(db, DIR); // applique 001 à 004 → current = 4
    expect(EXPECTED_SCHEMA_VERSION).toBe(4); // hypothèse du test, documentée

    const étatAujourdHui = schemaState(db);
    expect(étatAujourdHui.current).toBe(4);
    expect(étatAujourdHui.identityReady).toBe(true);
    expect(étatAujourdHui.moduleReady).toBe(true); // le module EST à jour aujourd'hui

    // Injection du scénario Sprint 2 : le CODE (pas la base) en attend 5.
    const étatSprint2 = schemaState(db, 5);
    expect(étatSprint2.current).toBe(4);
    expect(étatSprint2.expected).toBe(5);
    expect(étatSprint2.identityReady).toBe(true); // <- la barre de l'authentification : inchangée
    expect(étatSprint2.moduleReady).toBe(false); // <- la barre du module : en retard, à raison

    db.close();
  });

  it("identityReady dépend uniquement de IDENTITY_SCHEMA_VERSION, jamais de expected", () => {
    const db = createDb(':memory:');
    runMigrations(db, DIR);
    // Quel que soit ce qu'on injecte comme `expected`, la barre d'identité ne
    // bouge pas : c'est ce qui garantit qu'une future migration 006, 007…
    // ne referme jamais la porte de connexion.
    for (const expected of [IDENTITY_SCHEMA_VERSION, 4, 5, 99]) {
      expect(schemaState(db, expected).identityReady).toBe(true);
    }
    db.close();
  });
});
