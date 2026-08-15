// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { createDb } from '@/lib/db';
import { runMigrations } from '../migrate';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'src/lib/bsides/migrations');

function migrated() {
  const db = createDb(':memory:');
  runMigrations(db, DIR);
  return db;
}

describe('004_audit_actor_nullable', () => {
  it('accepte un acteur NULL (échec de connexion sur un email inconnu)', () => {
    const db = migrated();
    expect(() =>
      db.prepare(
        `INSERT INTO bsides_audit_log
           (id, actor_user_id, action, object_type, object_id, before, after, created_at)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?)`,
      ).run('a1', 'auth.login.failure', 'admin_users', 'unknown', '{}', '{}', 0),
    ).not.toThrow();
    db.close();
  });

  it('refuse toujours un acteur RÉEL mais inexistant (la clé étrangère reste active pour le non-NULL)', () => {
    const db = migrated();
    expect(() =>
      db.prepare(
        `INSERT INTO bsides_audit_log
           (id, actor_user_id, action, object_type, object_id, before, after, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run('a1', 'fantome', 'auth.login.failure', 'admin_users', 'x', '{}', '{}', 0),
    ).toThrow();
    db.close();
  });

  it('préserve les index attendus après la reconstruction de la table', () => {
    const db = migrated();
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'bsides_audit_log'")
      .all()
      .map((r) => (r as { name: string }).name);
    expect(indexes).toContain('idx_audit_object');
    expect(indexes).toContain('idx_audit_actor');
    db.close();
  });
});
