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
