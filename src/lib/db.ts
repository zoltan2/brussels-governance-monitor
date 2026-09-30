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
-- tard sur une base existante. Toute évolution passe par PRAGMA user_version et
-- des ALTER TABLE numérotés, jamais par une retouche de ce bloc.
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

-- Volontaires pour un échange (Q9 « oui » avec une adresse valide). AUCUN lien
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
`;

/** Opens a SQLite database at `path` and applies the schema (idempotent). */
export function createDb(path: string): DatabaseSync {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec(MIGRATIONS);
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
