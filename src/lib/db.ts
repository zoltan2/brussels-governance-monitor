// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * SQLite persistence (self-hosted deployments).
 *
 * Replaces Upstash/Redis for the two BGM state consumers (refonte votes,
 * chat logs). Uses the built-in `node:sqlite` (Node 22) — zero dependency.
 * Only active when DB_PATH is set: on Vercel (ephemeral filesystem) DB_PATH
 * is absent and the callers fall back to the Upstash path, so both backends
 * coexist until cutover.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS refonte_votes (
  id          TEXT PRIMARY KEY,
  axis1       TEXT NOT NULL,
  axis2       TEXT NOT NULL,
  axis3       TEXT NOT NULL,
  axis4       TEXT NOT NULL,
  axis5       TEXT NOT NULL,
  comment     TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  email_optin INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_refonte_votes_created ON refonte_votes(created_at);

CREATE TABLE IF NOT EXISTS chat_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  stream     TEXT NOT NULL,
  payload    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_logs_stream ON chat_logs(stream, id);

-- Précommandes du livre. Adresse en clé primaire : la première précommande
-- l'emporte, un second envoi du formulaire ne crée pas de doublon.
CREATE TABLE IF NOT EXISTS book_preorders (
  email      TEXT PRIMARY KEY,
  first_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_book_preorders_created ON book_preorders(created_at);

-- Curseurs des crons : jusqu'où un envoi périodique a déjà couvert ses
-- données. Écrit seulement après un envoi réussi.
CREATE TABLE IF NOT EXISTS cron_cursors (
  name       TEXT PRIMARY KEY,
  cursor_ms  INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Registre des désabonnements (src/lib/desabonnements.ts). Jamais l'adresse :
-- une empreinte HMAC. Le contact Resend est supprimé 30 jours après
-- desabonne_le, la ligne 24 mois après.
CREATE TABLE IF NOT EXISTS desabonnements (
  empreinte           TEXT PRIMARY KEY,
  desabonne_le        INTEGER NOT NULL,
  contact_supprime_le INTEGER
);
CREATE INDEX IF NOT EXISTS idx_desabonnements_date ON desabonnements(desabonne_le);

-- Paiements du chatbot (src/lib/chat-paiements.ts). Une session Stripe
-- n'ouvre l'accès qu'une fois ; un remboursement le révoque (revue red team
-- du 29/09/2026 : le lien de retour était réutilisable et survivait au
-- remboursement).
CREATE TABLE IF NOT EXISTS chat_paiements (
  session_id   TEXT PRIMARY KEY,
  debloque_le  INTEGER NOT NULL,
  verifie_le   INTEGER NOT NULL,
  rembourse    INTEGER NOT NULL DEFAULT 0
);

-- Coût du modèle par jour (src/lib/chat-budget.ts), en millionièmes de dollar.
CREATE TABLE IF NOT EXISTS chat_budget (
  jour      TEXT PRIMARY KEY,
  micro_usd INTEGER NOT NULL
);

-- Sondage lecteurs du digest (src/lib/sondage/, spec bgm-ops
-- 2026-09-25-sondage-lecteurs-design.md, § 13). SCHÉMA FIGÉ AVANT LE PILOTE :
-- « CREATE TABLE IF NOT EXISTS » ignore en silence une colonne ajoutée plus
-- tard sur une base existante. Toute évolution passe par une migration écrite
-- dans createDb (PRAGMA table_info puis ALTER TABLE, idempotente), jamais par
-- une retouche de ce bloc. Première du genre : migrerSondageEntretiens().
--
-- Réponses ANONYMES : une session aléatoire (cookie), aucune adresse, aucune IP,
-- des dates au jour près seulement. Supprimées après le 06/12/2027.
CREATE TABLE IF NOT EXISTS sondage_reponses (
  session  TEXT PRIMARY KEY,
  langue   TEXT NOT NULL,
  version  TEXT NOT NULL,
  reponses TEXT NOT NULL DEFAULT '{}',
  etape    TEXT NOT NULL,
  duree_ms INTEGER NOT NULL DEFAULT 0,
  cree_le  TEXT NOT NULL,
  maj_le   TEXT NOT NULL,
  termine  INTEGER NOT NULL DEFAULT 0,
  pilote   INTEGER NOT NULL DEFAULT 0
);

-- Volontaires pour un échange (Q9 « oui » avec des coordonnées valides). AUCUN lien
-- vers sondage_reponses : ni session, ni horodatage précis. Identifiant
-- aléatoire et table WITHOUT ROWID, pour que l'ordre d'insertion ne permette
-- pas de rapprocher une adresse d'une réponse. Vidée après les échanges, au
-- plus tard le 06/12/2026.
CREATE TABLE IF NOT EXISTS sondage_entretiens (
  id      TEXT PRIMARY KEY,
  email   TEXT NOT NULL,
  langue  TEXT NOT NULL,
  cree_le TEXT NOT NULL,
  statut  TEXT NOT NULL DEFAULT 'a_contacter'
) WITHOUT ROWID;
-- Ce CREATE est le schéma d'ORIGINE (#662), gardé tel quel : la migration
-- migrerSondageEntretiens() ci-dessous le fait évoluer (email facultatif,
-- colonne telephone), sur une base neuve comme sur la base de production.
`;

/** Schéma cible de sondage_entretiens (décision du 30/09/2026 : e-mail et/ou téléphone). */
const SONDAGE_ENTRETIENS_V2 = `
CREATE TABLE sondage_entretiens_v2 (
  id        TEXT PRIMARY KEY,
  email     TEXT,
  telephone TEXT,
  langue    TEXT NOT NULL,
  cree_le   TEXT NOT NULL,
  statut    TEXT NOT NULL DEFAULT 'a_contacter',
  CHECK (email IS NOT NULL OR telephone IS NOT NULL)
) WITHOUT ROWID;
`;

type Colonne = { name: string; notnull: number };

function colonnesEntretiens(db: DatabaseSync): Colonne[] {
  return db.prepare('PRAGMA table_info(sondage_entretiens)').all() as unknown as Colonne[];
}

/**
 * Q9 accepte désormais une adresse e-mail, un numéro de téléphone, ou les deux.
 * Migration idempotente, décidée sur l'état RÉEL de la table (PRAGMA table_info),
 * pas sur un numéro de version :
 *
 *  - `email` encore NOT NULL (schéma d'origine) : SQLite ne sait pas retirer une
 *    contrainte NOT NULL par ALTER TABLE, la table est donc reconstruite
 *    (création de la nouvelle, copie des lignes, suppression de l'ancienne,
 *    renommage), dans une transaction. Sûr en production : la table y est VIDE
 *    (campagne fermée jusqu'au 12/10/2026, aucune écriture possible avant) ; et
 *    même non vide, les lignes sont recopiées à l'identique, id compris. La
 *    table n'a ni index, ni déclencheur, ni vue qui en dépende.
 *  - `email` déjà facultative mais `telephone` absente : simple ADD COLUMN.
 *  - schéma déjà à jour : rien.
 *
 * L'état est relu APRÈS avoir pris le verrou d'écriture (BEGIN IMMEDIATE) : deux
 * processus qui ouvrent la base en même temps ne migrent pas deux fois.
 */
export function migrerSondageEntretiens(db: DatabaseSync): void {
  const aJour = (cols: Colonne[]) =>
    cols.some((c) => c.name === 'telephone') && cols.find((c) => c.name === 'email')?.notnull === 0;
  if (aJour(colonnesEntretiens(db))) return;

  db.exec('BEGIN IMMEDIATE');
  try {
    const cols = colonnesEntretiens(db);
    const email = cols.find((c) => c.name === 'email');
    if (email && email.notnull !== 0) {
      db.exec('DROP TABLE IF EXISTS sondage_entretiens_v2');
      db.exec(SONDAGE_ENTRETIENS_V2);
      const avecTel = cols.some((c) => c.name === 'telephone');
      db.exec(
        `INSERT INTO sondage_entretiens_v2 (id, email, telephone, langue, cree_le, statut)
         SELECT id, email, ${avecTel ? 'telephone' : 'NULL'}, langue, cree_le, statut FROM sondage_entretiens`,
      );
      db.exec('DROP TABLE sondage_entretiens');
      db.exec('ALTER TABLE sondage_entretiens_v2 RENAME TO sondage_entretiens');
    } else if (!cols.some((c) => c.name === 'telephone')) {
      db.exec('ALTER TABLE sondage_entretiens ADD COLUMN telephone TEXT');
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Opens a SQLite database at `path` and applies the schema (idempotent). */
export function createDb(path: string): DatabaseSync {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec(MIGRATIONS);
  migrerSondageEntretiens(db);
  return db;
}

/** True when a SQLite backend is configured (DB_PATH set). Cheap env check
 * with no side effect, for diagnostics / store selection. */
export function isDbConfigured(): boolean {
  return !!process.env.DB_PATH;
}

let _db: DatabaseSync | null | undefined;

/** Process-wide SQLite singleton, lazily opened from DB_PATH. Returns null on
 * Vercel (DB_PATH absent) so callers fall back to the Upstash path. */
export function getDb(): DatabaseSync | null {
  if (_db !== undefined) return _db;
  const path = process.env.DB_PATH;
  _db = path ? createDb(path) : null;
  return _db;
}
