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
  return resolveRedisCreds() !== null;
}

/**
 * Enregistre un vote dans Upstash. Si le store n'est pas configuré, fallback
 * vers stdout (utile en dev/local sans Redis). Retourne l'UUID du vote.
 */
export async function recordVote(vote: RefonteVote): Promise<string> {
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
