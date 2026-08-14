// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * État du schéma, en LECTURE SEULE (spec §5, R22).
 *
 * Lire n'est pas appliquer. Quand la base est en retard sur le code, le module
 * B-Sides s'éteint et BGM démarre normalement — l'état du schéma B-Sides ne
 * doit jamais pouvoir faire tomber le site éditorial.
 */
import type { DatabaseSync } from 'node:sqlite';

/** Version attendue par le code présent. À incrémenter avec chaque migration. */
export const EXPECTED_SCHEMA_VERSION = 3;

export interface SchemaState {
  current: number;
  expected: number;
  ready: boolean;
}

export function schemaState(db: DatabaseSync | null): SchemaState {
  const base = { current: 0, expected: EXPECTED_SCHEMA_VERSION, ready: false };
  if (!db) return base;

  try {
    const row = db
      .prepare('SELECT MAX(version) AS v FROM schema_migrations')
      .get() as { v: number | null } | undefined;
    const current = Number(row?.v ?? 0);
    return {
      current,
      expected: EXPECTED_SCHEMA_VERSION,
      ready: current >= EXPECTED_SCHEMA_VERSION,
    };
  } catch {
    // Table absente : base jamais migrée. Ce n'est pas une erreur, c'est un état.
    return base;
  }
}
