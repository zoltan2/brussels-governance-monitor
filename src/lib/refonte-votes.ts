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
  email_optin: boolean;
  has_email: boolean;
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
