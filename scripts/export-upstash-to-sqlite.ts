#!/usr/bin/env tsx
/**
 * export-upstash-to-sqlite.ts  (Phase D — migration des données prod)
 *
 * Lit l'état BGM stocké dans Upstash (PROD) et le réécrit dans un fichier
 * SQLite local conforme au schéma de `src/lib/db.ts`. Sert à migrer les
 * données réelles (votes /refonte + chat-logs) vers le backend self-hosted
 * juste avant le cutover Vercel → Hetzner.
 *
 * NON DESTRUCTIF : lit Upstash, n'écrit QUE le fichier SQLite local. Aucune
 * écriture côté Upstash. Idempotent : ré-exécutable sans dupliquer (votes via
 * INSERT OR REPLACE sur la PK ; chat_logs vidés par stream avant ré-insertion).
 *
 * Usage :
 *   UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... \
 *     npx tsx scripts/export-upstash-to-sqlite.ts [chemin-sortie.db]
 *
 *   - chemin de sortie : 1er argument, sinon $OUT_DB, sinon ./bgm-export.db
 *   - accepte aussi KV_REST_API_URL / KV_REST_API_TOKEN (convention Vercel KV)
 *
 * Au cutover : copier le .db produit dans le volume /opt/bgm/data/bgm.db du VPS.
 */

import { resolve } from 'node:path';
import { Redis } from '@upstash/redis';
import { createDb } from '../src/lib/db';
import type { LogStream } from '../src/lib/chat-logs';

// --- Upstash credentials (même résolution que les libs runtime) -------------
function resolveRedisCreds(): { url: string; token: string } {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.error(
      '[export] ERREUR : credentials Upstash manquants.\n' +
        '          Définir UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN\n' +
        '          (ou KV_REST_API_URL + KV_REST_API_TOKEN).',
    );
    process.exit(1);
  }
  return { url, token };
}

// --- Coercition (Upstash auto-désérialise booleans/numbers via JSON.parse) --
const asStr = (v: unknown): string =>
  typeof v === 'string' ? v : v == null ? '' : String(v);
const asBool = (v: unknown): boolean =>
  v === true || v === 'true' || v === '1' || v === 1;

const VOTES_ZSET = 'refonte-votes:by_date';
const VOTES_COUNTER_TOTAL = 'refonte-vote:counter:total';
const STREAM_TO_KEY: Record<LogStream, string> = {
  usage: 'chat:usage',
  errors: 'chat:errors',
  feedback: 'chat:feedback',
  'email-gate': 'chat:email-gate',
};

async function main(): Promise<void> {
  const outPath = resolve(
    process.argv[2] || process.env.OUT_DB || './bgm-export.db',
  );
  const redis = new Redis(resolveRedisCreds());
  const db = createDb(outPath);

  console.log(`[export] Sortie SQLite : ${outPath}`);

  // ---- 1. Votes /refonte ---------------------------------------------------
  // ZSET by_date : score = created_at, member = uuid. On lit avec les scores
  // pour disposer d'un created_at fiable même si le champ du hash manque.
  const pairs = (await redis.zrange<(string | number)[]>(VOTES_ZSET, 0, -1, {
    withScores: true,
  })) as (string | number)[];

  const insertVote = db.prepare(
    `INSERT OR REPLACE INTO refonte_votes
       (id, axis1, axis2, axis3, axis4, axis5, comment, email, email_optin, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let voteCount = 0;
  db.exec('BEGIN');
  for (let i = 0; i < pairs.length; i += 2) {
    const id = String(pairs[i]);
    const score = Number(pairs[i + 1]);
    const h = await redis.hgetall<Record<string, unknown>>(
      `refonte-vote:${id}`,
    );
    if (!h) {
      console.warn(`[export]   vote ${id} : hash introuvable, ignoré`);
      continue;
    }
    const createdAt = Number(h.created_at);
    insertVote.run(
      id,
      asStr(h.axis1),
      asStr(h.axis2),
      asStr(h.axis3),
      asStr(h.axis4),
      asStr(h.axis5),
      asStr(h.comment),
      asStr(h.email),
      asBool(h.email_optin) ? 1 : 0,
      Number.isFinite(createdAt) ? createdAt : score,
    );
    voteCount++;
  }
  db.exec('COMMIT');

  // ---- 2. Chat-logs (4 streams) -------------------------------------------
  const insertLog = db.prepare(
    'INSERT INTO chat_logs (stream, payload, created_at) VALUES (?, ?, ?)',
  );
  const deleteStream = db.prepare('DELETE FROM chat_logs WHERE stream = ?');

  const logCounts: Record<LogStream, number> = {
    usage: 0,
    errors: 0,
    feedback: 0,
    'email-gate': 0,
  };

  for (const stream of Object.keys(STREAM_TO_KEY) as LogStream[]) {
    const key = STREAM_TO_KEY[stream];
    // LRANGE 0 -1 = toute la liste, newest-first (sémantique LPUSH).
    const raw = await redis.lrange(key, 0, -1);
    // On réinsère oldest-first pour que l'id AUTOINCREMENT croisse avec la
    // récence (lecture admin = ORDER BY id DESC).
    const ordered = [...raw].reverse();

    db.exec('BEGIN');
    deleteStream.run(stream); // idempotence : on remplace le stream entier
    let prevTs = 0;
    for (const line of ordered) {
      // Upstash peut rendre un objet (auto-désérialisé) ou une string JSON.
      let entry: Record<string, unknown>;
      let payload: string;
      if (typeof line === 'object' && line !== null) {
        entry = line as Record<string, unknown>;
        payload = JSON.stringify(entry);
      } else {
        payload = String(line);
        try {
          entry = JSON.parse(payload) as Record<string, unknown>;
        } catch {
          entry = {};
        }
      }
      // created_at : dérivé du champ `ts` (ISO) présent sur toutes les
      // entrées ; fallback monotone si absent, pour préserver l'ordre.
      const parsed =
        typeof entry.ts === 'string' ? Date.parse(entry.ts) : NaN;
      const createdAt = Number.isFinite(parsed)
        ? parsed
        : prevTs
          ? prevTs + 1
          : Date.now();
      prevTs = createdAt;
      insertLog.run(stream, payload, createdAt);
      logCounts[stream]++;
    }
    db.exec('COMMIT');
  }

  // ---- 3. Vérification des totaux (DoD : totaux identiques) ----------------
  const upstashVoteTotal =
    (await redis.get<number>(VOTES_COUNTER_TOTAL)) ?? 0;
  const upstashZcard = await redis.zcard(VOTES_ZSET);

  console.log('\n[export] === Votes /refonte ===');
  console.log(`  Upstash counter:total = ${upstashVoteTotal}`);
  console.log(`  Upstash ZCARD by_date = ${upstashZcard}`);
  console.log(`  Insérés en SQLite     = ${voteCount}`);
  if (voteCount !== upstashZcard) {
    console.warn(
      `  ⚠️  écart ZCARD vs insérés (${upstashZcard} vs ${voteCount})`,
    );
  }
  if (upstashVoteTotal !== upstashZcard) {
    console.warn(
      `  ℹ️  counter:total (${upstashVoteTotal}) ≠ ZCARD (${upstashZcard}) côté Upstash`,
    );
  }

  console.log('\n[export] === Chat-logs ===');
  for (const stream of Object.keys(STREAM_TO_KEY) as LogStream[]) {
    const llen = await redis.llen(STREAM_TO_KEY[stream]);
    const inserted = logCounts[stream];
    const flag = llen === inserted ? '✅' : '⚠️';
    console.log(`  ${flag} ${stream.padEnd(11)} Upstash LLEN=${llen}  →  SQLite=${inserted}`);
  }

  console.log(`\n[export] Terminé. Base écrite : ${outPath}`);
}

main().catch((err) => {
  console.error('[export] Échec :', err);
  process.exit(1);
});
