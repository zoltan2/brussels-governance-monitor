// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Point d'entrée du runner. Bundlé en un fichier autonome pour l'image, où il
 * n'y a ni tsx ni devDependencies. Lancement en production :
 *   docker exec bgm-app node migrate.js
 */
import { createDb } from '../../src/lib/db';
import { runMigrations } from '../../src/lib/bsides/migrate';
import { join } from 'node:path';

const dbPath = process.env.DB_PATH;
if (!dbPath) {
  console.error('DB_PATH absent : rien à migrer.');
  process.exit(1);
}

const dir = process.env.MIGRATIONS_DIR ?? join(process.cwd(), 'migrations');
const db = createDb(dbPath);
const applied = runMigrations(db, dir);
console.log(
  applied.length
    ? `Migrations appliquées : ${applied.join(', ')}`
    : 'Aucune migration à appliquer.',
);
db.close();
