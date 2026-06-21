// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Stockage Upstash pour les votes de la consultation /refonte.
 *
 * Schéma :
 * - HASH `refonte-vote:{uuid}` — champs axis1..axis5, comment, email_optin,
 *   created_at, has_email
 * - ZSET `refonte-votes:by_date` — score = timestamp, member = uuid
 * - INCR `refonte-vote:counter:{axis}:{value}` — compteurs dérivés pour
 *   l'agrégation rapide en synthèse
 *
 * Le mail (s'il est fourni) n'est PAS persisté ici — il est propagé à
 * Resend via addContact() côté API route et oublié immédiatement.
 */
import { Redis } from '@upstash/redis';
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { getDb, isDbConfigured } from './db';

export interface RefonteVote {
  axis1: string;
  axis2: string;
  axis3: string;
  axis4: string;
  axis5: string;
  comment: string;
  /** Email saisi par le votant. Vide si pas fourni. Visible uniquement
   * dans /admin/refonte (auth-gated, privé éditeur). */
  email: string;
  /** L'utilisateur a coché « je veux suivre la suite ». N'est `true`
   * que si email a aussi été fourni. */
  email_optin: boolean;
}

let _redis: Redis | null | undefined;

function resolveRedisCreds(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
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

export function isVoteStoreConfigured(): boolean {
  return isDbConfigured() || resolveRedisCreds() !== null;
}

/**
 * Enregistre un vote dans Upstash. Si le store n'est pas configuré, fallback
 * vers stdout (utile en dev/local sans Redis). Retourne l'UUID du vote.
 */
export async function recordVote(vote: RefonteVote): Promise<string> {
  const db = getDb();
  if (db) return recordVoteSqlite(db, vote);

  const id = randomUUID();
  const created_at = Date.now();
  const redis = getRedis();

  if (!redis) {
    console.log('[refonte-vote] (no redis) ', { id, ...vote, created_at });
    return id;
  }

  const key = `refonte-vote:${id}`;
  await Promise.all([
    redis.hset(key, { ...vote, created_at }),
    redis.zadd('refonte-votes:by_date', {
      score: created_at,
      member: id,
    }),
    // Compteurs dérivés — pour la synthèse, pas d'agrégation à scanner.
    redis.incr(`refonte-vote:counter:axis1:${vote.axis1}`),
    redis.incr(`refonte-vote:counter:axis2:${vote.axis2}`),
    redis.incr(`refonte-vote:counter:axis3:${vote.axis3}`),
    redis.incr(`refonte-vote:counter:axis4:${vote.axis4}`),
    redis.incr(`refonte-vote:counter:axis5:${vote.axis5}`),
    redis.incr('refonte-vote:counter:total'),
  ]);

  return id;
}

/**
 * Compte le total de votes (pour la page admin / le seuil de 50).
 * Retourne 0 si pas de redis ou pas encore de vote.
 */
export async function getVoteCount(): Promise<number> {
  const db = getDb();
  if (db) return getVoteCountSqlite(db);
  const redis = getRedis();
  if (!redis) return 0;
  const total = await redis.get<number>('refonte-vote:counter:total');
  return total ?? 0;
}

const AXIS_OPTIONS: Record<string, readonly string[]> = {
  axis1: ['thermometre', 'mosaique', 'texte_fort', 'multilingue'],
  axis2: ['sobre_actuel', 'sobre_vivant', 'journalistique', 'voix_editeur'],
  axis3: ['digest', 'magazine', 'podcast', 'quiz', 'multilingue', 'plusieurs'],
  axis4: ['quotidien', 'hebdo', 'evenement', 'mixte'],
  axis5: ['minimal', 'standard', 'chiffres', 'complete'],
} as const;

export interface VoteRecord extends RefonteVote {
  id: string;
  created_at: number;
}

export interface VoteStats {
  total: number;
  recent: VoteRecord[];
  breakdown: Record<string, Record<string, number>>;
  storeConfigured: boolean;
}

/**
 * Lit total + N derniers votes + breakdown par axe.
 * Pour l'admin page et la synthèse finale.
 */
export async function getVoteStats(recentLimit = 20): Promise<VoteStats> {
  const db = getDb();
  if (db) return getVoteStatsSqlite(db, recentLimit);
  const redis = getRedis();
  if (!redis) {
    return { total: 0, recent: [], breakdown: {}, storeConfigured: false };
  }

  const [total, recentIds] = await Promise.all([
    redis.get<number>('refonte-vote:counter:total'),
    redis.zrange<string[]>('refonte-votes:by_date', 0, recentLimit - 1, {
      rev: true,
    }),
  ]);

  const recentHashes = recentIds.length
    ? await Promise.all(
        recentIds.map((id) =>
          redis.hgetall<Record<string, unknown>>(`refonte-vote:${id}`),
        ),
      )
    : [];

  // Upstash auto-deserializes booleans/numbers via JSON.parse, donc on doit
  // accepter les deux formes (boolean réel ou string « true »/« 1 »).
  const asBool = (v: unknown): boolean =>
    v === true || v === 'true' || v === '1' || v === 1;
  const asStr = (v: unknown): string =>
    typeof v === 'string' ? v : v == null ? '' : String(v);

  const recent: VoteRecord[] = recentHashes
    .map((h, i) => {
      if (!h) return null;
      return {
        id: recentIds[i],
        created_at: Number(h.created_at),
        axis1: asStr(h.axis1),
        axis2: asStr(h.axis2),
        axis3: asStr(h.axis3),
        axis4: asStr(h.axis4),
        axis5: asStr(h.axis5),
        comment: asStr(h.comment),
        email: asStr(h.email),
        email_optin: asBool(h.email_optin),
      };
    })
    .filter((v): v is VoteRecord => v !== null);

  // Lit tous les compteurs en parallèle pour reconstituer le breakdown.
  const breakdownEntries = Object.entries(AXIS_OPTIONS).flatMap(([axis, options]) =>
    options.map((opt) => ({ axis, opt, key: `refonte-vote:counter:${axis}:${opt}` })),
  );
  const counts = await Promise.all(
    breakdownEntries.map((e) => redis.get<number>(e.key)),
  );
  const breakdown: Record<string, Record<string, number>> = {};
  breakdownEntries.forEach((e, i) => {
    breakdown[e.axis] ??= {};
    breakdown[e.axis][e.opt] = counts[i] ?? 0;
  });

  return {
    total: total ?? 0,
    recent,
    breakdown,
    storeConfigured: true,
  };
}

// ---------------------------------------------------------------------------
// SQLite backend (self-hosted). Synchronous `node:sqlite`. Selected over Redis
// when a DB is configured (see db.ts / DB_PATH). The 7 Redis ops per vote
// (HSET + ZADD + 6×INCR) collapse to a single INSERT; reads are plain SQL
// aggregates over a bounded vote set.
// ---------------------------------------------------------------------------

const INSERT_VOTE_SQL = `INSERT INTO refonte_votes
  (id, axis1, axis2, axis3, axis4, axis5, comment, email, email_optin, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export function recordVoteSqlite(db: DatabaseSync, vote: RefonteVote): string {
  const id = randomUUID();
  db.prepare(INSERT_VOTE_SQL).run(
    id,
    vote.axis1,
    vote.axis2,
    vote.axis3,
    vote.axis4,
    vote.axis5,
    vote.comment,
    vote.email,
    vote.email_optin ? 1 : 0,
    Date.now(),
  );
  return id;
}

export function getVoteCountSqlite(db: DatabaseSync): number {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM refonte_votes')
    .get() as { n: number };
  return row.n;
}

export function getVoteStatsSqlite(
  db: DatabaseSync,
  recentLimit = 20,
): VoteStats {
  const total = getVoteCountSqlite(db);

  // rowid tiebreaker so votes sharing a millisecond keep insertion order.
  const recentRows = db
    .prepare(
      'SELECT * FROM refonte_votes ORDER BY created_at DESC, rowid DESC LIMIT ?',
    )
    .all(recentLimit) as Array<Record<string, unknown>>;

  const recent: VoteRecord[] = recentRows.map((r) => ({
    id: String(r.id),
    created_at: Number(r.created_at),
    axis1: String(r.axis1),
    axis2: String(r.axis2),
    axis3: String(r.axis3),
    axis4: String(r.axis4),
    axis5: String(r.axis5),
    comment: String(r.comment),
    email: String(r.email),
    email_optin: r.email_optin === 1,
  }));

  // Breakdown: pre-seed every known option at 0, then overlay GROUP BY counts.
  // `axis` is an internal allowlist key (axis1..axis5), never user input, so
  // interpolating it as a column identifier is safe.
  const breakdown: Record<string, Record<string, number>> = {};
  for (const [axis, options] of Object.entries(AXIS_OPTIONS)) {
    breakdown[axis] = {};
    for (const opt of options) breakdown[axis][opt] = 0;
    const rows = db
      .prepare(`SELECT ${axis} AS v, COUNT(*) AS n FROM refonte_votes GROUP BY ${axis}`)
      .all() as Array<{ v: string; n: number }>;
    for (const row of rows) breakdown[axis][row.v] = row.n;
  }

  return { total, recent, breakdown, storeConfigured: true };
}
