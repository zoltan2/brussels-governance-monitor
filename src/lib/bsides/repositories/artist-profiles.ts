// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { recordAudit } from '../audit';
import { withTransaction } from '../tx';
import { RESTRICTED_FIELDS, type CrmStatus, type Role } from '../schema';

/**
 * Colonnes servies à TOUS les rôles ayant `artists.read`.
 *
 * `pe.display_name` et `p.artist_name` en font partie : une liste d'artistes
 * sans nom n'est pas une liste, et l'écran du Sprint 2 ne pourrait pas s'en
 * servir. Le nom d'usage est la donnée la moins sensible du dossier — ce sont
 * l'état civil (`first_name` / `last_name`) et `internal_notes` qui sont
 * protégés, pas le nom sous lequel un artiste expose son travail.
 */
const COLONNES_PUBLIQUES =
  'p.id, p.slug, p.artist_name, p.crm_status, p.created_at, p.updated_at, pe.display_name';

export interface ArtistProfileView {
  id: string;
  slug: string;
  artist_name: string | null;
  crm_status: CrmStatus;
  created_at: number;
  updated_at: number;
  display_name: string | null;
  internal_notes?: string | null;
}

export function createProfile(
  db: DatabaseSync,
  input: {
    personId: string; slug: string; crmStatus: CrmStatus; actorUserId: string;
    artistName?: string; internalNotes?: string;
  },
): string {
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  withTransaction(db, () => {
    db.prepare(
      `INSERT INTO bsides_artist_profiles
         (id, person_id, artist_name, slug, crm_status, internal_notes,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id, input.personId, input.artistName ?? null, input.slug, input.crmStatus,
      input.internalNotes ?? null, now, now,
    );
    recordAudit(db, {
      actorUserId: input.actorUserId, action: 'artist.created',
      objectType: 'bsides_artist_profiles', objectId: id,
      before: {}, after: { crm_status: input.crmStatus, slug: input.slug },
    });
  });
  return id;
}

export function changeStatus(
  db: DatabaseSync,
  input: { profileId: string; status: CrmStatus; actorUserId: string },
): void {
  withTransaction(db, () => {
    const before = db
      .prepare('SELECT crm_status FROM bsides_artist_profiles WHERE id = ?')
      .get(input.profileId) as { crm_status: CrmStatus } | undefined;
    if (!before) throw new Error(`Profil introuvable : ${input.profileId}`);

    db.prepare(
      'UPDATE bsides_artist_profiles SET crm_status = ?, updated_at = ? WHERE id = ?',
    ).run(input.status, Math.floor(Date.now() / 1000), input.profileId);

    recordAudit(db, {
      actorUserId: input.actorUserId, action: 'artist.status_changed',
      objectType: 'bsides_artist_profiles', objectId: input.profileId,
      before: { crm_status: before.crm_status }, after: { crm_status: input.status },
    });
  });
}

/**
 * Projection par rôle : les notes internes ne sont pas filtrées après coup,
 * elles ne sont pas sélectionnées du tout. Une donnée jamais chargée ne peut
 * pas fuiter par un log, une sérialisation ou un oubli (spec §7.1).
 */
export function listForRole(db: DatabaseSync, roles: readonly Role[]): ArtistProfileView[] {
  // Visibilité déclarée champ par champ, jamais déduite d'une opération (R35) :
  // ouvrir `artists.write` à un rôle lui donnerait sinon les notes internes par
  // effet de bord, sans que personne ne l'ait décidé.
  const voitLesNotes = roles.some((r) => RESTRICTED_FIELDS.internal_notes.includes(r));

  // `p.internal_notes` : les notes internes vivent sur le PROFIL (spec §6.2),
  // pas sur la personne — le §6.1 ne les y place pas.
  const sql = voitLesNotes
    ? `SELECT ${COLONNES_PUBLIQUES}, p.internal_notes
         FROM bsides_artist_profiles p
         JOIN bsides_people pe ON pe.id = p.person_id
        ORDER BY p.created_at`
    : `SELECT ${COLONNES_PUBLIQUES}
         FROM bsides_artist_profiles p
         JOIN bsides_people pe ON pe.id = p.person_id
        ORDER BY p.created_at`;

  // `as unknown as` : caster directement vers `ArtistProfileView[]` échoue au
  // typecheck (TS2352, « neither type sufficiently overlaps ») — un artefact
  // de TypeScript qui traite différemment une `interface` nommée et un
  // littéral de même forme lors de la conversion d'un tableau. Le détour par
  // `unknown` est celui que le compilateur suggère lui-même.
  return db.prepare(sql).all() as unknown as ArtistProfileView[];
}
