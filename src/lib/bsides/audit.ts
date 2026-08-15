// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Journal d'audit (spec §8).
 *
 * `recordAudit` n'ouvre PAS de transaction : il écrit dans celle de l'appelant.
 * Une mutation qui échoue ne doit laisser aucune trace, ce qui suppose que les
 * deux écritures partagent le même sort.
 *
 * Les champs personnels ne sont jamais journalisés en valeur (R14) : un journal
 * immuable et un effacement RGPD immédiat ne peuvent pas être vrais ensemble.
 * On garde qui a modifié quoi et quand, sans copie éternelle de la donnée.
 */
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { PERSONAL_FIELDS } from './schema';

const MASK = '[modifié]';

export interface AuditEntry {
  actorUserId: string;
  action: string;
  objectType: string;
  objectId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export function maskPersonal(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    out[k] = PERSONAL_FIELDS.has(k) ? MASK : v;
  }
  return out;
}

export function recordAudit(db: DatabaseSync, entry: AuditEntry): void {
  db.prepare(
    `INSERT INTO bsides_audit_log
       (id, actor_user_id, action, object_type, object_id, before, after, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    entry.actorUserId,
    entry.action,
    entry.objectType,
    entry.objectId,
    JSON.stringify(maskPersonal(entry.before)),
    JSON.stringify(maskPersonal(entry.after)),
    Math.floor(Date.now() / 1000),
  );
}
