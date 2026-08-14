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

/**
 * Le schéma n'est plus défini ici. Depuis le Sprint 1 B-Sides, la seule
 * autorité est le runner de `src/lib/bsides/migrate.ts`, appliqué par une
 * étape de déploiement explicite. Deux mécanismes croyant chacun posséder le
 * schéma produiraient deux endroits où se tromper (spec §5).
 */

/** Opens a SQLite database at `path`. Le schéma appartient au runner. */
export function createDb(path: string): DatabaseSync {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  // SQLite désactive les clés étrangères par défaut, et le réglage vaut par
  // connexion : sans cette ligne, toutes les FK du domaine seraient
  // décoratives — y compris la protection de l'acteur du journal d'audit.
  db.exec('PRAGMA foreign_keys = ON');
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
