// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { createDb } from '@/lib/db';
import { schemaState, EXPECTED_SCHEMA_VERSION } from './schema-version';

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
    expect(state.ready).toBe(false);
    db.close();
  });

  it('rend ready faux, jamais une exception, quand la base est absente', () => {
    expect(schemaState(null)).toEqual({
      current: 0,
      expected: EXPECTED_SCHEMA_VERSION,
      ready: false,
    });
  });
});
