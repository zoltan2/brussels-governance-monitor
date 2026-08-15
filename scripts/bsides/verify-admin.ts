// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Affiche le compte semé pour confirmation humaine AVANT la bascule.
 * N'affiche jamais le hash — un secret lu dans un journal de terminal est un
 * secret partagé (spec §7.6, étape 3).
 */
import { createDb } from '../../src/lib/db';
import { findByEmail, rolesOf } from '../../src/lib/bsides/repositories/admin-users';

const dbPath = process.env.DB_PATH;
const email = process.env.ADMIN_EMAIL;
if (!dbPath || !email) {
  console.error('DB_PATH et ADMIN_EMAIL sont requis.');
  process.exit(1);
}

const db = createDb(dbPath);
const user = findByEmail(db, email);
if (!user) {
  console.error(`AUCUN compte pour ${email}. NE PAS BASCULER.`);
  process.exit(1);
}
console.log({
  email: user.email,
  display_name: user.display_name,
  is_active: user.is_active === 1,
  roles: rolesOf(db, user.id),
  algo: user.password_algo,
});
console.log('\nVérifie les rôles ci-dessus avant de fusionner la bascule.');
db.close();
