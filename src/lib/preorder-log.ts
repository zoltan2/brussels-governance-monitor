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
 * Précommandes enregistrées dans `]afterMs, untilMs]`, de la plus ancienne à
 * la plus récente. C'est ce que lit le récap du mardi, entre son curseur et
 * l'instant de l'envoi : borne ouverte à gauche, fermée à droite, pour que
 * deux fenêtres consécutives se touchent sans se chevaucher.
 */
export async function listPreordersBetween(
  afterMs: number,
  untilMs: number,
): Promise<PreorderRecord[]> {
  const db = getDb();
  if (db) {
    return db
      .prepare(
        `SELECT email, first_name, created_at FROM book_preorders
         WHERE created_at > ? AND created_at <= ? ORDER BY created_at ASC`,
      )
      .all(afterMs, untilMs)
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
  //
  // Les scores sont des millisecondes entières : `afterMs + 1` exclut la
  // borne gauche sans passer par la syntaxe exclusive « (x » de Redis.
  const rows = await redis.zrange<(string | number)[]>(
    ZSET_KEY,
    afterMs + 1,
    untilMs,
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

// ---------------------------------------------------------------------------
// Curseur du récap
// ---------------------------------------------------------------------------

/**
 * Fenêtre du tout premier récap, faute de curseur : les 168 h que couvrait
 * l'ancienne fenêtre glissante, pour ne rien perdre ni doubler à la bascule.
 */
export const RECAP_FIRST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const RECAP_CURSOR_NAME = 'preorders-recap';
const RECAP_CURSOR_KEY = 'book-preorders:recap-cursor';

/**
 * Fenêtre que doit couvrir le récap : de son curseur jusqu'à maintenant.
 *
 * Elle remplace « maintenant moins 168 h », qui ne suivait pas le calendrier :
 * au passage à l'heure d'hiver deux mardis 09:00 sont séparés de 169 h (une
 * heure jamais couverte), à l'heure d'été de 167 h (une heure comptée deux
 * fois), et un rattrapage `Persistent=true` créait un trou puis un doublon.
 * Avec un curseur, chaque récap reprend exactement où le précédent s'est
 * arrêté, quel que soit l'écart entre deux envois.
 */
export function recapWindow(
  cursor: number | null,
  now: number,
): { after: number; until: number } {
  const after = cursor ?? now - RECAP_FIRST_WINDOW_MS;
  // Une horloge qui recule ne doit jamais faire reculer le curseur, sans quoi
  // le récap suivant recompterait ce qu'il a déjà envoyé.
  return { after, until: Math.max(now, after) };
}

/** Borne de fin du dernier récap envoyé, ou null s'il n'y en a jamais eu. */
export async function readRecapCursor(): Promise<number | null> {
  const db = getDb();
  if (db) {
    const row = db
      .prepare('SELECT cursor_ms FROM cron_cursors WHERE name = ?')
      .get(RECAP_CURSOR_NAME);
    return row ? Number(row.cursor_ms) : null;
  }

  const redis = getRedis();
  if (!redis) return null;
  const value = await redis.get<number>(RECAP_CURSOR_KEY);
  return value == null ? null : Number(value);
}

/**
 * Enregistre la borne de fin du récap. À n'appeler qu'APRÈS un envoi réussi :
 * un envoi raté laisse le curseur en place, et le récap suivant reprend la
 * même période au lieu de la perdre.
 */
export async function saveRecapCursor(cursorMs: number): Promise<void> {
  const db = getDb();
  if (db) {
    db.prepare(
      `INSERT INTO cron_cursors (name, cursor_ms, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
         cursor_ms = excluded.cursor_ms,
         updated_at = excluded.updated_at`,
    ).run(RECAP_CURSOR_NAME, cursorMs, Date.now());
    return;
  }

  const redis = getRedis();
  if (!redis) return;
  await redis.set(RECAP_CURSOR_KEY, cursorMs);
}
