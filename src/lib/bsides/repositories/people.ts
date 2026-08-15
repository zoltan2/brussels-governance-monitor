// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { recordAudit } from '../audit';
import { withTransaction } from '../tx';

export function createPerson(
  db: DatabaseSync,
  input: {
    email?: string; firstName?: string; lastName?: string; displayName?: string;
    phone?: string; preferredLocale?: string; country?: string; city?: string;
    addressLine1?: string; addressLine2?: string; postalCode?: string;
  },
): string {
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    `INSERT INTO bsides_people
       (id, first_name, last_name, display_name, email, phone, preferred_locale,
        country, city, address_line1, address_line2, postal_code,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, input.firstName ?? null, input.lastName ?? null, input.displayName ?? null,
    input.email ?? null, input.phone ?? null, input.preferredLocale ?? null,
    input.country ?? null, input.city ?? null, input.addressLine1 ?? null,
    input.addressLine2 ?? null, input.postalCode ?? null, now, now,
  );
  return id;
}

/**
 * Effacement RGPD (spec §47) — immédiat, pas différé, et distinct du
 * `deleted_at` qui n'est qu'une suppression douce. Les enregistrements
 * comptables du §19 ne sont pas touchés : ils portent un nom figé, jamais une
 * référence vivante.
 *
 * L'effacement ne s'arrête pas à `bsides_people`. Toute donnée personnelle
 * portée ailleurs doit tomber avec elle, sinon l'effacement est partiel — ce
 * qui est pire qu'absent, puisqu'il se croit fait :
 *
 *   - `bsides_artist_profiles.internal_notes` : les notes internes ont suivi le
 *     §6.2 sur le profil ; elles décrivent la personne et restent personnelles.
 *   - `bsides_person_media` : les portraits. Supprimés, pas anonymisés — une
 *     image reste identifiante quoi qu'on écrive à côté. `portrait_media_id`
 *     est délié d'abord, sans quoi la clé étrangère refuserait la suppression.
 *
 * Les masters d'œuvres (`bsides_work_media`) ne sont PAS touchés : ils portent
 * des droits contractuels et relèvent d'un régime de conservation opposé (§36).
 * C'est la raison d'être de la séparation des deux tables de médias.
 */
export function erasePerson(db: DatabaseSync, personId: string, actorUserId: string): void {
  withTransaction(db, () => {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      `UPDATE bsides_people
          SET email = NULL, first_name = NULL, last_name = NULL,
              display_name = NULL, phone = NULL, preferred_locale = NULL,
              country = NULL, city = NULL, address_line1 = NULL,
              address_line2 = NULL, postal_code = NULL,
              deleted_at = ?, updated_at = ?
        WHERE id = ?`,
    ).run(now, now, personId);

    db.prepare(
      `UPDATE bsides_artist_profiles
          SET internal_notes = NULL, portrait_media_id = NULL, updated_at = ?
        WHERE person_id = ?`,
    ).run(now, personId);

    db.prepare('DELETE FROM bsides_person_media WHERE person_id = ?').run(personId);

    recordAudit(db, {
      actorUserId, action: 'person.erased', objectType: 'bsides_people',
      objectId: personId, before: {}, after: {},
    });
  });
}
