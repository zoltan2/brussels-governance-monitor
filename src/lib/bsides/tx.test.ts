// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { withTransaction } from './tx';

describe('withTransaction', () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('CREATE TABLE t (v TEXT)');
  });
  afterEach(() => db.close());

  it('valide quand tout se passe bien', () => {
    withTransaction(db, () => db.prepare('INSERT INTO t VALUES (?)').run('a'));
    expect(db.prepare('SELECT COUNT(*) c FROM t').get()).toEqual({ c: 1 });
  });

  it('défait tout en cas d\'erreur', () => {
    expect(() =>
      withTransaction(db, () => {
        db.prepare('INSERT INTO t VALUES (?)').run('a');
        throw new Error('boum');
      }),
    ).toThrow('boum');
    expect(db.prepare('SELECT COUNT(*) c FROM t').get()).toEqual({ c: 0 });
  });

  it('s\'imbrique : l\'échec interne défait tout le bloc externe', () => {
    expect(() =>
      withTransaction(db, () => {
        db.prepare('INSERT INTO t VALUES (?)').run('externe');
        withTransaction(db, () => {
          db.prepare('INSERT INTO t VALUES (?)').run('interne');
          throw new Error('boum');
        });
      }),
    ).toThrow('boum');
    expect(db.prepare('SELECT COUNT(*) c FROM t').get()).toEqual({ c: 0 });
  });

  it('préserve l\'erreur d\'origine, sans la masquer par celle du rollback', () => {
    expect(() =>
      withTransaction(db, () => {
        throw new Error('cause réelle');
      }),
    ).toThrow('cause réelle');
  });
});
