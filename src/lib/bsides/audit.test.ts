// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { createDb } from '@/lib/db';
import { runMigrations } from './migrate';
import { recordAudit, maskPersonal } from './audit';

const DIR = join(process.cwd(), 'src/lib/bsides/migrations');

function dbWithActor(): DatabaseSync {
  const db = createDb(':memory:');
  runMigrations(db, DIR);
  db.prepare(
    'INSERT INTO admin_users (id, email, password_hash, password_algo, display_name, created_at) VALUES (?,?,?,?,?,?)',
  ).run('u1', 'a@b.c', 'h', 'scrypt', 'A', 0);
  return db;
}

describe('maskPersonal', () => {
  it('remplace la valeur des champs personnels, garde le nom', () => {
    expect(maskPersonal({ crm_status: 'qualified', email: 'x@y.z' })).toEqual({
      crm_status: 'qualified',
      email: '[modifié]',
    });
  });
});

describe('recordAudit', () => {
  it('n\'écrit aucun champ personnel en clair', () => {
    const db = dbWithActor();
    recordAudit(db, {
      actorUserId: 'u1',
      action: 'artist.updated',
      objectType: 'bsides_people',
      objectId: 'p1',
      before: { crm_status: 'contacted', email: 'avant@x.be' },
      after: { crm_status: 'qualified', email: 'apres@x.be' },
    });
    const row = db.prepare('SELECT before, after FROM bsides_audit_log').get() as {
      before: string; after: string;
    };
    expect(row.before).not.toContain('avant@x.be');
    expect(row.after).not.toContain('apres@x.be');
    expect(JSON.parse(row.before).crm_status).toBe('contacted');
    db.close();
  });

  it('ne laisse aucune ligne quand la mutation englobante échoue', () => {
    const db = dbWithActor();
    db.exec('BEGIN');
    recordAudit(db, {
      actorUserId: 'u1', action: 'x', objectType: 't', objectId: 'o',
      before: {}, after: {},
    });
    db.exec('ROLLBACK');
    expect(db.prepare('SELECT COUNT(*) c FROM bsides_audit_log').get()).toEqual({ c: 0 });
    db.close();
  });

  it('refuse un acteur inconnu', () => {
    const db = dbWithActor();
    expect(() =>
      recordAudit(db, {
        actorUserId: 'fantome', action: 'x', objectType: 't', objectId: 'o',
        before: {}, after: {},
      }),
    ).toThrow();
    db.close();
  });
});
