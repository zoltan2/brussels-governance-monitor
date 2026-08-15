// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { createDb } from '@/lib/db';
import { runMigrations } from '../migrate';
import { createUser, rolesOf, findByEmail, upgradeHash } from './admin-users';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'src/lib/bsides/migrations');

function migrated() {
  const db = createDb(':memory:');
  runMigrations(db, DIR);
  return db;
}

describe('admin-users', () => {
  it('crée un compte avec ses rôles', () => {
    const db = migrated();
    const id = createUser(db, {
      email: 'curateur@bgm.be', passwordHash: 'h', algo: 'scrypt',
      displayName: 'Curateur', roles: ['CURATOR', 'ANALYST'],
    });
    expect(rolesOf(db, id).sort()).toEqual(['ANALYST', 'CURATOR']);
    expect(findByEmail(db, 'curateur@bgm.be')?.id).toBe(id);
    db.close();
  });

  it('cherche par email sans tenir compte de la casse', () => {
    const db = migrated();
    createUser(db, {
      email: 'a@b.c', passwordHash: 'h', algo: 'scrypt', displayName: 'A', roles: [],
    });
    expect(findByEmail(db, 'A@B.C')).not.toBeNull();
    db.close();
  });

  it('le rehash ne modifie PAS sessions_valid_after', () => {
    const db = migrated();
    const id = createUser(db, {
      email: 'a@b.c', passwordHash: 'ancien', algo: 'bcrypt', displayName: 'A', roles: [],
    });
    const avant = findByEmail(db, 'a@b.c')!.sessions_valid_after;
    upgradeHash(db, id, 'nouveau-scrypt');
    const apres = findByEmail(db, 'a@b.c')!;
    expect(apres.password_hash).toBe('nouveau-scrypt');
    expect(apres.password_algo).toBe('scrypt');
    expect(apres.sessions_valid_after).toBe(avant);
    db.close();
  });

  it('ignore un compte supprimé en douceur', () => {
    const db = migrated();
    const id = createUser(db, {
      email: 'a@b.c', passwordHash: 'h', algo: 'scrypt', displayName: 'A', roles: [],
    });
    db.prepare('UPDATE admin_users SET deleted_at = ? WHERE id = ?').run(1, id);
    expect(findByEmail(db, 'a@b.c')).toBeNull();
    db.close();
  });
});
