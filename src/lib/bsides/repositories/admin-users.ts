// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { Role } from '../schema';

export interface AdminUserRow {
  id: string;
  email: string;
  password_hash: string;
  password_algo: 'scrypt' | 'bcrypt';
  display_name: string;
  is_active: number;
  sessions_valid_after: number;
}

export function findByEmail(db: DatabaseSync, email: string): AdminUserRow | null {
  const row = db
    .prepare(
      `SELECT id, email, password_hash, password_algo, display_name, is_active,
              sessions_valid_after
         FROM admin_users
        WHERE lower(email) = lower(?) AND deleted_at IS NULL`,
    )
    .get(email);
  return (row as AdminUserRow | undefined) ?? null;
}

export function rolesOf(db: DatabaseSync, userId: string): Role[] {
  return db
    .prepare('SELECT role FROM admin_user_roles WHERE user_id = ?')
    .all(userId)
    .map((r) => (r as { role: Role }).role);
}

export function createUser(
  db: DatabaseSync,
  input: {
    email: string; passwordHash: string; algo: 'scrypt' | 'bcrypt';
    displayName: string; roles: readonly Role[];
  },
): string {
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    `INSERT INTO admin_users
       (id, email, password_hash, password_algo, display_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, input.email, input.passwordHash, input.algo, input.displayName, now);
  const ins = db.prepare('INSERT INTO admin_user_roles (user_id, role) VALUES (?, ?)');
  for (const role of input.roles) ins.run(id, role);
  return id;
}

export function touchLastLogin(db: DatabaseSync, userId: string): void {
  db.prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?')
    .run(Math.floor(Date.now() / 1000), userId);
}

/**
 * Migration transparente bcrypt -> scrypt à la première connexion réussie.
 *
 * NE TOUCHE PAS `sessions_valid_after` (R16). La règle « écriture du hash =
 * invalidation des sessions » est la bonne pour un changement de mot de passe
 * décidé par un humain ; ici elle détruirait la session à l'instant même de sa
 * création, et le seul compte administrateur entrerait en boucle de connexion.
 */
export function upgradeHash(db: DatabaseSync, userId: string, scryptHash: string): void {
  db.prepare(
    "UPDATE admin_users SET password_hash = ?, password_algo = 'scrypt' WHERE id = ?",
  ).run(scryptHash, userId);
}
