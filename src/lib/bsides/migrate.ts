// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Runner de migrations — unique autorité sur le schéma (spec §5).
 *
 * Trois garanties : transactionnel (une migration passe entièrement ou pas du
 * tout), idempotent (rejouer ne fait rien), à contrôle d'intégrité (un fichier
 * modifié après application est un refus, jamais une réapplication silencieuse).
 *
 * N'est JAMAIS appelé à l'import ni au démarrage : c'est une étape de
 * déploiement explicite, parce que la base est partagée avec BGM éditorial.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

export class MigrationError extends Error {
  constructor(
    message: string,
    readonly version: number,
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

const REGISTRY = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  checksum   TEXT NOT NULL
);
`;

interface MigrationFile {
  version: number;
  name: string;
  sql: string;
  checksum: string;
}

function load(dir: string): MigrationFile[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((name) => {
      const version = Number.parseInt(name.slice(0, 3), 10);
      if (!Number.isInteger(version)) {
        throw new MigrationError(`Nom de migration invalide : ${name}`, 0);
      }
      const sql = readFileSync(join(dir, name), 'utf8');
      return {
        version,
        name,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    })
    .sort((a, b) => a.version - b.version);
}

export function appliedVersions(db: DatabaseSync): number[] {
  db.exec(REGISTRY);
  return db
    .prepare('SELECT version FROM schema_migrations ORDER BY version')
    .all()
    .map((r) => Number((r as { version: number }).version));
}

/** Vrai si la base porte déjà le schéma BGM historique : la version 1 est alors
 * adoptée sans exécution, les tables existant depuis avant le runner. */
function baselineAlreadyPresent(db: DatabaseSync): boolean {
  const row = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'refonte_votes'",
    )
    .get();
  return row !== undefined;
}

export function runMigrations(db: DatabaseSync, dir: string): number[] {
  db.exec(REGISTRY);

  const known = new Map<number, string>(
    db
      .prepare('SELECT version, checksum FROM schema_migrations')
      .all()
      .map((r) => {
        const row = r as { version: number; checksum: string };
        return [Number(row.version), row.checksum];
      }),
  );

  const applied: number[] = [];

  for (const m of load(dir)) {
    const seen = known.get(m.version);
    if (seen !== undefined) {
      if (seen !== m.checksum) {
        throw new MigrationError(
          `La migration ${m.name} a déjà été appliquée mais son contenu a changé. ` +
            `Une migration appliquée ne se modifie jamais : créer un nouveau fichier.`,
          m.version,
        );
      }
      continue;
    }

    const adopt = m.version === 1 && baselineAlreadyPresent(db);

    db.exec('BEGIN');
    try {
      if (!adopt) db.exec(m.sql);
      db.prepare(
        'INSERT INTO schema_migrations (version, applied_at, checksum) VALUES (?, ?, ?)',
      ).run(m.version, Math.floor(Date.now() / 1000), m.checksum);
      db.exec('COMMIT');
    } catch (err) {
      // Le rollback est lui-même protégé : si la transaction est déjà défaite,
      // son échec ne doit pas remplacer la cause réelle, seule utile au
      // diagnostic (R36). Le runner ouvre bien un BEGIN et non un SAVEPOINT :
      // il s'exécute seul, hors de toute transaction englobante.
      try {
        db.exec('ROLLBACK');
      } catch {
        /* déjà défaite */
      }
      throw new MigrationError(
        `Migration ${m.name} en échec : ${(err as Error).message}`,
        m.version,
      );
    }
    applied.push(m.version);
  }

  return applied;
}
