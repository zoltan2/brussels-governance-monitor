// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runMigrations, appliedVersions, MigrationError } from './migrate';

function tmpMigrations(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'bsides-mig-'));
  for (const [name, sql] of Object.entries(files)) {
    writeFileSync(join(dir, name), sql);
  }
  return dir;
}

describe('runMigrations', () => {
  let db: DatabaseSync;
  const dirs: string[] = [];

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
  });
  afterEach(() => {
    db.close();
    dirs.forEach((d) => rmSync(d, { recursive: true, force: true }));
    dirs.length = 0;
  });

  function dir(files: Record<string, string>): string {
    const d = tmpMigrations(files);
    dirs.push(d);
    return d;
  }

  it('applique les migrations dans l\'ordre des numéros', () => {
    const d = dir({
      '002_b.sql': 'CREATE TABLE b (id TEXT);',
      '001_a.sql': 'CREATE TABLE a (id TEXT);',
    });
    expect(runMigrations(db, d)).toEqual([1, 2]);
    expect(appliedVersions(db)).toEqual([1, 2]);
  });

  it('est idempotent : rejouer n\'applique rien de plus', () => {
    const d = dir({ '001_a.sql': 'CREATE TABLE a (id TEXT);' });
    runMigrations(db, d);
    expect(runMigrations(db, d)).toEqual([]);
    expect(appliedVersions(db)).toEqual([1]);
  });

  it('refuse une migration déjà appliquée dont le fichier a changé', () => {
    const d = dir({ '001_a.sql': 'CREATE TABLE a (id TEXT);' });
    runMigrations(db, d);
    writeFileSync(join(d, '001_a.sql'), 'CREATE TABLE a (id TEXT, extra TEXT);');
    expect(() => runMigrations(db, d)).toThrow(MigrationError);
  });

  it('ne laisse aucune trace partielle quand une migration échoue', () => {
    const d = dir({
      '001_a.sql': 'CREATE TABLE a (id TEXT); CREATE TABLE ERREUR SYNTAXE;',
    });
    expect(() => runMigrations(db, d)).toThrow(MigrationError);
    expect(appliedVersions(db)).toEqual([]);
    const tables = db
      .prepare("select name from sqlite_master where name = 'a'")
      .all();
    expect(tables).toEqual([]);
  });

  it('adopte la version 1 sans l\'exécuter sur une base BGM déjà peuplée', () => {
    db.exec('CREATE TABLE refonte_votes (id TEXT PRIMARY KEY)'); // schéma divergent
    const d = dir({
      '001_baseline.sql': 'CREATE TABLE refonte_votes (id TEXT PRIMARY KEY, axis1 TEXT);',
    });
    expect(runMigrations(db, d)).toEqual([1]);
    // La table d'origine est intacte : le fichier n'a pas été exécuté.
    const cols = db.prepare('PRAGMA table_info(refonte_votes)').all();
    expect(cols).toHaveLength(1);
  });
});
