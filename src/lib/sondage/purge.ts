// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Purge du sondage lecteurs. PAS de cron : Zoltán la déclenche depuis
 * /fr/admin/sondage (bouton « Purger », route /api/admin/sondage/purge).
 *
 *  - `sondage_entretiens` est vidée à CHAQUE appel. À lancer une fois les
 *    échanges menés, et au plus tard le 06/12/2026 (promesse de /privacy et de
 *    l'accueil du questionnaire).
 *  - `sondage_reponses` n'est vidée qu'APRÈS le 06/12/2027, fin de conservation
 *    des réponses brutes. Exporter d'abord les résultats agrégés (bouton
 *    « Exporter les réponses » de l'admin) : seuls ceux-là sont gardés ensuite.
 *  - Puis `VACUUM` et un point de contrôle du journal WAL : un DELETE seul laisse
 *    les adresses lisibles dans les pages libres du fichier (constaté à la revue
 *    du 25/09 : 66 témoins restants après checkpoint, 0 après VACUUM).
 *
 * Les sauvegardes (copie toutes les 6 h, gardée 7 jours) contiennent encore les
 * données purgées jusqu'à leur rotation : c'est ce que dit /privacy.
 */
import type { DatabaseSync } from 'node:sqlite';
import { FIN_CONSERVATION_REPONSES, jourBruxelles } from './campagne';

/** Mot à taper dans l'admin pour confirmer la purge. */
export const CONFIRMATION_PURGE = 'PURGER';

export interface BilanPurge {
  entretiensSupprimes: number;
  reponsesSupprimees: number;
  /** false tant que la fin de conservation des réponses n'est pas dépassée. */
  reponsesEchues: boolean;
}

export function purgerSondage(db: DatabaseSync, maintenant: Date): BilanPurge {
  const reponsesEchues = jourBruxelles(maintenant) > FIN_CONSERVATION_REPONSES;
  let entretiensSupprimes = 0;
  let reponsesSupprimees = 0;
  db.exec('BEGIN');
  try {
    entretiensSupprimes = Number(db.prepare('DELETE FROM sondage_entretiens').run().changes);
    if (reponsesEchues) {
      reponsesSupprimees = Number(db.prepare('DELETE FROM sondage_reponses').run().changes);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  // Hors transaction : VACUUM y est interdit.
  db.exec('VACUUM');
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  return { entretiensSupprimes, reponsesSupprimees, reponsesEchues };
}
