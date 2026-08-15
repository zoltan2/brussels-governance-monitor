// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Transaction composable (R30).
 *
 * SAVEPOINT plutôt que BEGIN : les points de sauvegarde s'imbriquent, alors
 * qu'un second BEGIN lève `cannot start a transaction within a transaction`.
 * Un repository peut donc en appeler un autre, et une Server Action peut
 * englober plusieurs mutations avec leur audit — ce que le §8 exige.
 *
 * Le rollback est lui-même protégé : si la transaction est déjà défaite, son
 * échec ne doit pas remplacer l'erreur d'origine, seule intéressante (R36).
 */
import type { DatabaseSync } from 'node:sqlite';

let compteur = 0;

export function withTransaction<T>(db: DatabaseSync, fn: () => T): T {
  // `isTransaction` dit si une transaction est DÉJÀ ouverte sur cette
  // connexion : c'est ce qui distingue l'appel le plus externe d'un appel
  // imbriqué, sans compteur de module. Un compteur global serait faux dès
  // qu'une seconde connexion existe (les tests en ouvrent une par cas).
  const externe = !db.isTransaction;
  const nom = `sp_${compteur++}`;
  db.exec(`SAVEPOINT ${nom}`);
  try {
    const out = fn();
    db.exec(`RELEASE ${nom}`);
    return out;
  } catch (err) {
    try {
      db.exec(`ROLLBACK TO ${nom}`);
      db.exec(`RELEASE ${nom}`);
    } catch {
      // Le savepoint n'a pas pu être défait. Au niveau le plus externe, rendre
      // la main ici laisserait une transaction OUVERTE sur une connexion
      // partagée avec le site éditorial : tout écrivain suivant se retrouverait
      // enrôlé dedans, et un `busy_timeout` de 5 s ne suffirait pas à le
      // masquer longtemps. On défait donc tout.
      if (externe) {
        try {
          db.exec('ROLLBACK');
        } catch {
          /* déjà défaite */
        }
      }
    }
    throw err;
  }
}
