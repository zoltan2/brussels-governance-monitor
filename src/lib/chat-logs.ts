// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Chat telemetry log store.
 *
 * Persists the 4 chat streams (usage / errors / feedback / email-gate) so the
 * admin page can read them on Vercel, where the filesystem is ephemeral.
 *
 * - Production (Vercel): Upstash Redis LIST per stream, capped at 10 000
 *   entries (LTRIM) to stay inside the free tier comfortably.
 * - Local development: JSONL files under ./logs/, same behaviour as before.
 *
 * Selection rule: if UPSTASH_REDIS_REST_URL is set, use Redis. Otherwise
 * fall back to the filesystem. This makes `KV_REST_API_URL` users opt in
 * by renaming to the Upstash convention (both Vercel KV and the Upstash
 * marketplace integration now inject the UPSTASH_* names).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { Redis } from '@upstash/redis';
import type { DatabaseSync } from 'node:sqlite';
import { getDb, isDbConfigured } from './db';

export type LogStream = 'usage' | 'errors' | 'feedback' | 'email-gate';

const STREAM_TO_KEY: Record<LogStream, string> = {
  usage: 'chat:usage',
  errors: 'chat:errors',
  feedback: 'chat:feedback',
  'email-gate': 'chat:email-gate',
};

const STREAM_TO_FILE: Record<LogStream, string> = {
  usage: 'chat-usage.jsonl',
  errors: 'chat-errors.jsonl',
  feedback: 'chat-feedback.jsonl',
  'email-gate': 'chat-email-gate.jsonl',
};

const MAX_ENTRIES_PER_STREAM = 10_000;

const LOCAL_LOG_DIR = path.join(process.cwd(), 'logs');

let _redis: Redis | null | undefined;

/**
 * Resolve Redis credentials. The Vercel ecosystem exposes Upstash under two
 * naming conventions depending on how it was connected:
 *   - Upstash Marketplace integration → UPSTASH_REDIS_REST_URL / _TOKEN
 *   - Vercel Storage → KV                → KV_REST_API_URL / _TOKEN
 * Accept both so either wiring path works without code changes.
 */
function resolveRedisCreds(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const creds = resolveRedisCreds();
  if (!creds) {
    _redis = null;
    return null;
  }
  _redis = new Redis(creds);
  return _redis;
}

/** Lets the admin page surface a clear diagnostic when no store is wired. */
export function isPersistentStoreConfigured(): boolean {
  return isDbConfigured() || resolveRedisCreds() !== null;
}

/**
 * Append an entry to a stream. Fire-and-forget — callers should not await
 * (log writes must never delay the API response). Errors are logged to
 * stderr so they appear in Vercel Runtime Logs.
 */
export function pushLog(
  stream: LogStream,
  entry: Record<string, unknown>,
): void {
  const payload = JSON.stringify(entry);
  // Mirror to stdout in every environment so Vercel Runtime Logs + local
  // `npm run dev` both see the event. This is the fallback observability
  // path when the persistent store is unavailable or inspection is needed.
  console.log(`[chat-${stream}]`, payload);

  const db = getDb();
  if (db) {
    pushLogSqlite(db, stream, entry);
    return;
  }

  const redis = getRedis();
  if (redis) {
    const key = STREAM_TO_KEY[stream];
    // LPUSH + LTRIM: newest first, cap the list at MAX_ENTRIES_PER_STREAM.
    redis
      .lpush(key, payload)
      .then(() => redis.ltrim(key, 0, MAX_ENTRIES_PER_STREAM - 1))
      .catch((err: unknown) => {
        console.error(`[chat-${stream}] redis write failed:`, err);
      });
    return;
  }

  // Dev fallback: append to local JSONL.
  const file = path.join(LOCAL_LOG_DIR, STREAM_TO_FILE[stream]);
  fs.mkdir(LOCAL_LOG_DIR, { recursive: true })
    .then(() => fs.appendFile(file, payload + '\n'))
    .catch((err) => {
      console.error(`[chat-${stream}] file write failed:`, err);
    });
}

/**
 * Read all available entries for a stream. Newest first, up to `limit`.
 * On Redis, uses LRANGE. On local fs, reads the JSONL and reverses.
 */
export async function readLogs<T>(
  stream: LogStream,
  limit = MAX_ENTRIES_PER_STREAM,
): Promise<T[]> {
  const db = getDb();
  if (db) return readLogsSqlite<T>(db, stream, limit);

  const redis = getRedis();
  if (redis) {
    const key = STREAM_TO_KEY[stream];
    const raw = await redis.lrange(key, 0, limit - 1);
    const out: T[] = [];
    for (const line of raw) {
      if (typeof line === 'object' && line !== null) {
        out.push(line as T);
        continue;
      }
      try {
        out.push(JSON.parse(String(line)) as T);
      } catch {
        /* skip malformed */
      }
    }
    // Redis gives us newest-first (LPUSH semantics). Callers that expected
    // chronological order must reverse themselves — existing admin code
    // already does `.slice(-N).reverse()` on a chronological array, so
    // we return chronological here to stay drop-in compatible.
    return out.reverse();
  }

  // Dev fallback: read JSONL, chronological order.
  const file = path.join(LOCAL_LOG_DIR, STREAM_TO_FILE[stream]);
  let raw: string;
  try {
    raw = await fs.readFile(file, 'utf-8');
  } catch {
    return [];
  }
  const out: T[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      /* skip malformed */
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// SQLite backend (self-hosted). One row per log entry; the Redis LPUSH + LTRIM
// pair becomes an INSERT plus a periodic prune (run by a systemd timer rather
// than on the hot path).
// ---------------------------------------------------------------------------

export function pushLogSqlite(
  db: DatabaseSync,
  stream: LogStream,
  entry: Record<string, unknown>,
): void {
  db.prepare(
    'INSERT INTO chat_logs (stream, payload, created_at) VALUES (?, ?, ?)',
  ).run(stream, JSON.stringify(entry), Date.now());
}

/** Most-recent `limit` entries of a stream, returned chronological (oldest
 * first) to stay drop-in compatible with the existing admin code. */
export function readLogsSqlite<T>(
  db: DatabaseSync,
  stream: LogStream,
  limit = MAX_ENTRIES_PER_STREAM,
): T[] {
  const rows = db
    .prepare(
      'SELECT payload FROM chat_logs WHERE stream = ? ORDER BY id DESC LIMIT ?',
    )
    .all(stream, limit) as Array<{ payload: string }>;
  const out: T[] = [];
  for (const row of rows) {
    try {
      out.push(JSON.parse(row.payload) as T);
    } catch {
      /* skip malformed */
    }
  }
  return out.reverse();
}

/** Deletes all but the latest `keep` entries of a stream (the LTRIM cap). */
export function pruneLogsSqlite(
  db: DatabaseSync,
  stream: LogStream,
  keep = MAX_ENTRIES_PER_STREAM,
): void {
  db.prepare(
    `DELETE FROM chat_logs WHERE stream = ? AND id NOT IN (
       SELECT id FROM chat_logs WHERE stream = ? ORDER BY id DESC LIMIT ?
     )`,
  ).run(stream, stream, keep);
}
