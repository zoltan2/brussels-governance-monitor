// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * SEULE fonction de contrôle d'accès (spec §4).
 *
 * Toute variante — assertPermission, canDo… — est proscrite : deux noms
 * produiraient deux mécanismes concurrents, donc deux endroits où se tromper.
 *
 * `requireRole()` est la PREMIÈRE instruction de chaque Server Action et de
 * chaque route handler. Un layout protège le rendu des pages, pas les actions :
 * une Server Action est un endpoint POST à identifiant stable, appelable sans
 * jamais rendre le layout (spec §7.2).
 */
import type { DatabaseSync } from 'node:sqlite';
import { auth } from '@/auth';
import { getDb } from '@/lib/db';
import { can, type Operation, type Role } from './schema';
import { schemaState } from './schema-version';
import { rolesOf } from './repositories/admin-users';

export class ForbiddenError extends Error {
  constructor(readonly operation: Operation) {
    super(`Opération refusée : ${operation}`);
    this.name = 'ForbiddenError';
  }
}

/** Base en retard sur le code : le module est éteint (R22). Distinct d'un refus
 * de droits — ce n'est pas l'utilisateur qui est en cause, et le message doit le
 * dire, sinon on cherchera un problème de permissions pendant une heure. */
export class ModuleNotReadyError extends Error {
  constructor() {
    super('Module B-Sides indisponible : migration de base en attente.');
    this.name = 'ModuleNotReadyError';
  }
}

export async function requireRole(
  op: Operation,
): Promise<{ userId: string; roles: Role[]; db: DatabaseSync }> {
  // Le `db` est rendu à l'appelant : `requireRole` vient de l'ouvrir et de le
  // valider, et chaque Server Action en a besoin juste après. Sans cela, tout
  // appelant rappellerait `getDb()` et referait le contrôle de disponibilité —
  // ou l'oublierait.
  const db = getDb();
  if (!db) throw new ModuleNotReadyError();
  // Contrôlé AVANT la session : sans les tables, `rolesOf` lèverait une erreur
  // SQL brute au lieu d'un refus lisible (R34).
  if (!schemaState(db).ready) throw new ModuleNotReadyError();

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new ForbiddenError(op);

  // Rôles relus en base à chaque vérification : un retrait de rôle prend effet
  // immédiatement, sans attendre l'expiration d'un jeton (spec §7.3).
  const roles = rolesOf(db, userId);
  if (!can(roles, op)) throw new ForbiddenError(op);

  return { userId, roles, db };
}
