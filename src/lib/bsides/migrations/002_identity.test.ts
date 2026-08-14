// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDb } from '@/lib/db';
import { runMigrations } from '../migrate';
import { ROLES } from '../schema';

const DIR = join(process.cwd(), 'src/lib/bsides/migrations');
const SQL_FILE = join(DIR, '002_identity.sql');

describe('002_identity', () => {
  function migrated() {
    const db = createDb(':memory:');
    runMigrations(db, DIR);
    return db;
  }

  it('refuse un rôle hors de la liste fermée', () => {
    const db = migrated();
    db.prepare(
      'INSERT INTO admin_users (id, email, password_hash, password_algo, display_name, created_at) VALUES (?,?,?,?,?,?)',
    ).run('u1', 'a@b.c', 'h', 'scrypt', 'A', 0);
    expect(() =>
      db.prepare('INSERT INTO admin_user_roles (user_id, role) VALUES (?,?)').run('u1', 'PIRATE'),
    ).toThrow();
    db.close();
  });

  it('refuse deux comptes avec le même email', () => {
    const db = migrated();
    const ins = db.prepare(
      'INSERT INTO admin_users (id, email, password_hash, password_algo, display_name, created_at) VALUES (?,?,?,?,?,?)',
    );
    ins.run('u1', 'a@b.c', 'h', 'scrypt', 'A', 0);
    expect(() => ins.run('u2', 'a@b.c', 'h', 'scrypt', 'B', 0)).toThrow();
    db.close();
  });

  it('interdit de supprimer un compte cité dans le journal', () => {
    const db = migrated();
    db.prepare(
      'INSERT INTO admin_users (id, email, password_hash, password_algo, display_name, created_at) VALUES (?,?,?,?,?,?)',
    ).run('u1', 'a@b.c', 'h', 'scrypt', 'A', 0);
    db.prepare(
      'INSERT INTO bsides_audit_log (id, actor_user_id, action, object_type, object_id, before, after, created_at) VALUES (?,?,?,?,?,?,?,?)',
    ).run('a1', 'u1', 'artist.updated', 'bsides_people', 'p1', '{}', '{}', 0);
    expect(() =>
      db.prepare('DELETE FROM admin_users WHERE id = ?').run('u1'),
    ).toThrow();
    db.close();
  });

  it('la clause CHECK(role) du SQL concorde avec ROLES de schema.ts, dans les deux sens', () => {
    const sql = readFileSync(SQL_FILE, 'utf8');
    const match = sql.match(/CHECK\s*\(\s*role\s+IN\s*\(([^)]*)\)\s*\)/);
    expect(match, 'clause CHECK(role IN (...)) introuvable dans 002_identity.sql').not.toBeNull();

    const rolesInSql = (match as RegExpMatchArray)[1]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s.replace(/^'|'$/g, ''));

    // Sens 1 : chaque rôle de ROLES doit figurer dans la clause CHECK du SQL —
    // un rôle déclaré côté code mais absent de la migration serait rejeté en
    // base sans que le code ne le sache.
    for (const role of ROLES) {
      expect(rolesInSql).toContain(role);
    }

    // Sens 2 : aucune valeur de la clause CHECK ne doit être absente de ROLES —
    // un test qui ne vérifierait que le sens 1 laisserait passer un rôle
    // fantôme, accepté en base mais inconnu du code applicatif.
    for (const role of rolesInSql) {
      expect(ROLES as readonly string[]).toContain(role);
    }

    expect(rolesInSql.length).toBe(ROLES.length);
  });
});
