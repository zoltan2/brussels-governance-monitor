// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Réinjecte dans le journal des précommandes déjà connues, à partir d'un CSV.
 *
 * Contexte : entre le 16/04 et le 08/09/2026, la route de précommande a cessé
 * de créer des contacts Resend sans le moindre signal. Les seules personnes
 * récupérables l'ont été via les contacts survivants et le journal d'emails,
 * qui n'archive que trente jours.
 *
 * Le CSV n'est PAS versionné : ce dépôt est public et ces lignes sont des
 * données personnelles. Il vit dans `.local/analyses/`, qui est gitignoré.
 *
 * Format attendu, en-tête comprise :
 *   date,prenom,email,source,note
 *   2026-03-26,Nathalie,quelquun@example.be,contact Resend,
 *
 * Idempotent : INSERT OR IGNORE, l'adresse est clé primaire. Relançable.
 *
 * Usage, là où DB_PATH pointe vers la base :
 *   DB_PATH=/opt/bgm/data/bgm.db npx tsx scripts/backfill-preorders.ts \
 *     .local/analyses/precommandes-lasagne-recuperees.csv
 */
import { readFileSync } from 'node:fs';
import { getDb } from '../src/lib/db';

const DEFAULT_CSV = '.local/analyses/precommandes-lasagne-recuperees.csv';

interface Row {
  date: string;
  firstName: string;
  email: string;
  note: string;
}

/** Découpe une ligne CSV simple (pas de guillemets attendus dans ce fichier). */
function parseCsv(raw: string): Row[] {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = {
    date: header.indexOf('date'),
    prenom: header.indexOf('prenom'),
    email: header.indexOf('email'),
    note: header.indexOf('note'),
  };
  if (idx.date < 0 || idx.email < 0) {
    throw new Error("CSV inattendu : il faut au moins les colonnes 'date' et 'email'.");
  }

  return lines.slice(1).map((line) => {
    const c = line.split(',');
    return {
      date: (c[idx.date] ?? '').trim(),
      firstName: idx.prenom >= 0 ? (c[idx.prenom] ?? '').trim() : '',
      email: (c[idx.email] ?? '').trim(),
      note: idx.note >= 0 ? (c[idx.note] ?? '').trim() : '',
    };
  });
}

function main(): void {
  const path = process.argv[2] ?? DEFAULT_CSV;

  const db = getDb();
  if (!db) {
    console.error(
      'DB_PATH n’est pas posé : ce script doit tourner là où la base existe.',
    );
    process.exit(1);
  }

  let rows: Row[];
  try {
    rows = parseCsv(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`Lecture de ${path} impossible :`, err);
    process.exit(1);
  }

  const insert = db.prepare(
    `INSERT OR IGNORE INTO book_preorders (email, first_name, created_at)
     VALUES (?, ?, ?)`,
  );

  let inserted = 0;
  let skippedTests = 0;
  for (const row of rows) {
    if (row.note === 'test') {
      skippedTests++;
      continue;
    }
    if (!row.email) continue;
    const ts = Date.parse(`${row.date}T12:00:00Z`);
    if (Number.isNaN(ts)) {
      console.warn(`date illisible, ligne ignorée : ${row.date}`);
      continue;
    }
    const res = insert.run(row.email.toLowerCase(), row.firstName, ts);
    if (res.changes > 0) inserted++;
  }

  const total = db
    .prepare('SELECT COUNT(*) AS n FROM book_preorders')
    .get() as { n: number };

  console.log(`${inserted} précommande(s) réinjectée(s) depuis ${path}.`);
  if (skippedTests) console.log(`${skippedTests} ligne(s) de test ignorée(s).`);
  console.log(`Journal : ${total.n} précommande(s) au total.`);
}

main();
