// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { recordAudit } from '../audit';
import { withTransaction } from '../tx';

export function createPerson(
  db: DatabaseSync,
  input: {
    email?: string; legalName?: string; displayName?: string;
    phone?: string; country?: string; internalNotes?: string;
  },
): string {
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    `INSERT INTO bsides_people
       (id, email, legal_name, display_name, phone, country, internal_notes,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, input.email ?? null, input.legalName ?? null, input.displayName ?? null,
    input.phone ?? null, input.country ?? null, input.internalNotes ?? null, now, now,
  );
  return id;
}

/**
 * Effacement RGPD (spec §10) — immédiat, pas différé, et distinct du
 * `deleted_at` qui n'est qu'une suppression douce. Les enregistrements
 * comptables du §19 ne sont pas touchés : ils portent un nom figé, jamais une
 * référence vivante.
 */
export function erasePerson(db: DatabaseSync, personId: string, actorUserId: string): void {
  withTransaction(db, () => {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      `UPDATE bsides_people
          SET email = NULL, legal_name = NULL, display_name = NULL, phone = NULL,
              country = NULL, internal_notes = NULL, deleted_at = ?, updated_at = ?
        WHERE id = ?`,
    ).run(now, now, personId);
    recordAudit(db, {
      actorUserId, action: 'person.erased', objectType: 'bsides_people',
      objectId: personId, before: {}, after: {},
    });
  });
}
