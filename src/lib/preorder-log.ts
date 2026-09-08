// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Journal des précommandes du livre « La Lasagne ».
 *
 * Raison d'être : jusqu'au 08/09/2026, une précommande n'existait que sous
 * deux formes, toutes deux fragiles. Un contact Resend, qui a cessé d'être
 * créé le 16/04 sans le moindre signal ; et l'email de confirmation, que le
 * journal Resend n'archive que 30 jours. Quatre mois de précommandes sont
 * ainsi devenus irrécupérables.
 *
 * Ce journal est désormais la source de vérité, écrit avant tout appel à
 * Resend. Il suit le schéma dual de refonte-votes.ts : SQLite quand DB_PATH
 * est posé (Hetzner, depuis la bascule du 19/07), Upstash sinon (Vercel), et
 * stdout en dernier recours — jamais une précommande ne doit échouer faute
 * de stockage.
 */
import { Redis } from '@upstash/redis';
import { getDb } from './db';

export interface Preorder {
  email: string;
  firstName: string;
}

export interface PreorderRecord extends Preorder {
  created_at: number;
}

const ZSET_KEY = 'book-preorders:by_date';
const NAMES_KEY = 'book-preorders:names';

let _redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  _redis = url && token ? new Redis({ url, token }) : null;
  return _redis;
}

/** Normalise l'adresse : c'est elle qui sert de clé d'unicité. */
function normalise(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Enregistre une précommande. La première l'emporte : un second envoi avec
 * la même adresse ne crée pas de doublon et n'écrase pas la date, pour que
 * le récap du mardi ne compte pas deux fois la même personne.
 */
export async function recordPreorder(preorder: Preorder): Promise<void> {
  const email = normalise(preorder.email);
  const firstName = preorder.firstName.trim();
  const created_at = Date.now();

  const db = getDb();
  if (db) {
    db.prepare(
      `INSERT OR IGNORE INTO book_preorders (email, first_name, created_at)
       VALUES (?, ?, ?)`,
    ).run(email, firstName, created_at);
    return;
  }

  const redis = getRedis();
  if (!redis) {
    console.log('[book-preorder] (aucun stockage configuré)', {
      email,
      firstName,
      created_at,
    });
    return;
  }

  // Le membre est l'adresse SEULE. Il a d'abord contenu `{email, firstName}`
  // sérialisé, ce qui faisait dédoublonner Upstash sur le couple : deux
  // graphies du prénom créaient deux entrées, là où SQLite (adresse en clé
  // primaire) n'en gardait qu'une. Les deux backends dédoublonnent désormais
  // pareil. Le prénom vit à côté, dans un hash.
  await redis.zadd(ZSET_KEY, { nx: true }, { score: created_at, member: email });
  // `hsetnx` — la première graphie du prénom l'emporte, comme le score.
  await redis.hsetnx(NAMES_KEY, email, firstName);
}

/**
 * Précommandes enregistrées depuis `sinceMs`, de la plus ancienne à la plus
 * récente. C'est ce que lit le récap du mardi.
 */
export async function listPreordersSince(
  sinceMs: number,
): Promise<PreorderRecord[]> {
  const db = getDb();
  if (db) {
    return db
      .prepare(
        `SELECT email, first_name, created_at FROM book_preorders
         WHERE created_at >= ? ORDER BY created_at ASC`,
      )
      .all(sinceMs)
      .map((r) => ({
        email: String(r.email),
        firstName: String(r.first_name),
        created_at: Number(r.created_at),
      }));
  }

  const redis = getRedis();
  if (!redis) return [];

  // zrange ... withScores rend [membre, score, membre, score, ...].
  //
  // Surtout : `@upstash/redis` désérialise déjà tout seul (`parseRecursive`).
  // La version précédente faisait `JSON.parse(String(rows[i]))` sur un membre
  // que le SDK avait déjà transformé en objet : `String(objet)` rendait
  // « [object Object] » et la lecture jetait à tous les coups. Le repli
  // Upstash n'a donc jamais pu fonctionner. On ne reparse plus rien.
  const rows = await redis.zrange<(string | number)[]>(
    ZSET_KEY,
    sinceMs,
    '+inf',
    { byScore: true, withScores: true },
  );
  if (rows.length === 0) return [];

  const names = ((await redis.hgetall(NAMES_KEY)) ?? {}) as Record<
    string,
    string
  >;

  const out: PreorderRecord[] = [];
  for (let i = 0; i < rows.length; i += 2) {
    const email = String(rows[i]);
    out.push({
      email,
      firstName: names[email] ?? '',
      created_at: Number(rows[i + 1]),
    });
  }
  return out;
}
