// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Crée le premier SUPER_ADMIN depuis les variables d'environnement existantes.
 * Le hash bcrypt actuel est repris tel quel : il reste vérifiable, et la
 * première connexion réussie le remplacera par un hash scrypt (spec §7.5).
 * Idempotent : relancer sur un compte existant ne fait rien.
 */
import { createDb } from '../../src/lib/db';
import { createUser, findByEmail } from '../../src/lib/bsides/repositories/admin-users';

const dbPath = process.env.DB_PATH;
const email = process.env.ADMIN_EMAIL;
const hash = process.env.ADMIN_PASSWORD_HASH;

if (!dbPath || !email || !hash) {
  console.error('DB_PATH, ADMIN_EMAIL et ADMIN_PASSWORD_HASH sont requis.');
  process.exit(1);
}

const db = createDb(dbPath);
if (findByEmail(db, email)) {
  console.log(`Le compte ${email} existe déjà — rien à faire.`);
} else {
  createUser(db, {
    email, passwordHash: hash, algo: 'bcrypt',
    displayName: 'Admin', roles: ['SUPER_ADMIN'],
  });
  console.log(`SUPER_ADMIN créé pour ${email}.`);
}
db.close();
