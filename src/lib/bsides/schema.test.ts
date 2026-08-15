// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { createDb } from '@/lib/db';
import { runMigrations } from './migrate';
import {
  PERMISSIONS,
  can,
  ROLES,
  PERSONAL_FIELDS,
  RESTRICTED_FIELDS,
  OPERATIONS,
  type Operation,
} from './schema';

describe('matrice de permissions', () => {
  it('refuse par défaut : un rôle sans droit explicite est rejeté', () => {
    expect(can(['ANALYST'], 'artists.write')).toBe(false);
    expect(can([], 'artists.read')).toBe(false);
  });

  it('accorde ce que la matrice déclare', () => {
    expect(can(['CURATOR'], 'artists.write')).toBe(true);
    expect(can(['ANALYST'], 'artists.read')).toBe(true);
  });

  it('cumule les rôles', () => {
    expect(can(['ANALYST', 'EDITOR'], 'works.publish')).toBe(true);
  });

  it('réserve l\'effacement RGPD au seul SUPER_ADMIN', () => {
    expect(PERMISSIONS['people.erase']).toEqual(['SUPER_ADMIN']);
  });

  it('n\'accorde aucune opération à un rôle inconnu', () => {
    // @ts-expect-error rôle hors de la liste fermée
    expect(can(['PIRATE'], 'artists.read')).toBe(false);
  });

  it('couvre tous les rôles déclarés dans au moins une opération', () => {
    const cited = new Set(Object.values(PERMISSIONS).flat());
    for (const role of ROLES) expect(cited.has(role)).toBe(true);
  });

  it('classe email et nom légal comme personnels', () => {
    expect(PERSONAL_FIELDS.has('email')).toBe(true);
    expect(PERSONAL_FIELDS.has('legal_name')).toBe(true);
    expect(PERSONAL_FIELDS.has('crm_status')).toBe(false);
  });

  it('couvre chaque colonne personnelle du §6.1, nom par nom', () => {
    // L'état civil du §6.1 est first_name / last_name, pas un legal_name
    // fusionné : un champ absent d'ici passerait en clair dans le journal
    // d'audit.
    for (const champ of [
      'first_name', 'last_name', 'display_name', 'email', 'phone',
      'country', 'city', 'address_line1', 'address_line2', 'postal_code',
      'internal_notes',
    ]) {
      expect(PERSONAL_FIELDS.has(champ), `${champ} devrait être personnel`).toBe(true);
    }
  });

  it('refuse les opérations inconnues', () => {
    expect(can(['SUPER_ADMIN'], 'operation.inexistante' as Operation)).toBe(false);
  });

  it('chaque couple rôle × opération donne le verdict déclaré, refus compris', () => {
    for (const op of OPERATIONS) {
      for (const role of ROLES) {
        const attendu = PERMISSIONS[op].includes(role);
        expect({ op, role, verdict: can([role], op) }).toEqual({ op, role, verdict: attendu });
      }
    }
  });

  // Repris de `authz.test.ts` (revue de branche du 2026-08-15, B-4) : ce test
  // éprouve `PERMISSIONS`, donc `schema.ts` — sa place naturelle, pas celle de
  // la garde `requireRole`.
  it('n\'ouvre aucune opération à tous les rôles sans le déclarer', () => {
    for (const op of OPERATIONS) {
      expect(PERMISSIONS[op].length).toBeGreaterThan(0);
    }
  });
});

/**
 * `RESTRICTED_FIELDS` / `PERSONAL_FIELDS` visent des noms de colonnes —
 * jamais vérifiés contre le schéma réel jusqu'ici. C'est exactement ce qui a
 * laissé passer `minimum_price` : une clé qui ne correspondait à aucune
 * colonne migrée, ni à aucun nom de colonne futur nommé par la spec
 * maîtresse, en visant en réalité `offers.artist_minimum_eur` (§6.7, ligne
 * 356) — un typo qui serait resté vert indéfiniment, jusqu'au jour où le
 * Sprint 4 aurait créé la vraie colonne et où le test « le champ restreint
 * est protégé » serait resté au vert sur le mauvais nom pendant que la
 * colonne réelle passait en clair.
 */
describe('RESTRICTED_FIELDS / PERSONAL_FIELDS : les clés visent de vraies colonnes', () => {
  const MIGRATIONS_DIR = join(process.cwd(), 'src/lib/bsides/migrations');

  // Sprint 4, spec §6.7 ligne 356 : `offers.artist_minimum_eur`. Il n'existe
  // encore aucune table `offers` (aucune migration ne la crée) : cette clé
  // est donc listée ici EXPLICITEMENT plutôt que silencieusement ignorée.
  // Le jour où une migration créera `offers`, le second test de ce bloc
  // rougira et forcera à retirer l'entrée d'ici, pour que la clé soit alors
  // vérifiée comme toutes les autres.
  const RESTRICTED_FIELDS_SPRINT4 = new Set(['artist_minimum_eur']);

  // `legal_name` : colonne volontairement absente du schéma depuis
  // l'alignement sur le §6.1 (voir le commentaire sur `PERSONAL_FIELDS`
  // dans schema.ts) — un souvenir délibéré, pas un oubli, et pas une
  // colonne à venir.
  const PERSONAL_FIELDS_REMOVED = new Set(['legal_name']);

  // `iban` / `vat_number` : ni colonne migrée, ni nom de colonne futur cité
  // nulle part dans la spec maîtresse (le §20 « Commission and artist
  // payouts » ne détaille aucun schéma de colonnes). Ni confirmées, ni
  // fausses : à trancher avec le produit, pas à faire disparaître
  // silencieusement de la couverture de ce test.
  const PERSONAL_FIELDS_UNCONFIRMED = new Set(['iban', 'vat_number']);

  function colonnesMigrees(): Set<string> {
    const db: DatabaseSync = createDb(':memory:');
    runMigrations(db, MIGRATIONS_DIR);
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' " +
          "AND name NOT LIKE 'sqlite_%' AND name != 'schema_migrations'",
      )
      .all() as { name: string }[];
    const colonnes = new Set<string>();
    for (const { name } of tables) {
      const cols = db.prepare(`PRAGMA table_info(${name})`).all() as { name: string }[];
      for (const c of cols) colonnes.add(c.name);
    }
    db.close();
    return colonnes;
  }

  it(
    'rougirait si une clé de RESTRICTED_FIELDS ou PERSONAL_FIELDS ne désignait ' +
      'aucune colonne réelle des migrations déjà appliquées, hors des exceptions ' +
      'listées ci-dessus et documentées une à une — c\'est exactement le défaut que ' +
      '`minimum_price` avait introduit en visant une colonne qu\'aucune migration, ' +
      'passée ou future, n\'appellera jamais ainsi',
    () => {
      const colonnes = colonnesMigrees();

      for (const clé of Object.keys(RESTRICTED_FIELDS)) {
        if (RESTRICTED_FIELDS_SPRINT4.has(clé)) continue;
        expect(
          colonnes.has(clé),
          `RESTRICTED_FIELDS['${clé}'] ne correspond à aucune colonne migrée`,
        ).toBe(true);
      }

      for (const clé of PERSONAL_FIELDS) {
        if (PERSONAL_FIELDS_REMOVED.has(clé) || PERSONAL_FIELDS_UNCONFIRMED.has(clé)) continue;
        expect(
          colonnes.has(clé),
          `PERSONAL_FIELDS['${clé}'] ne correspond à aucune colonne migrée`,
        ).toBe(true);
      }
    },
  );

  it('les clés listées « Sprint 4 » ne doivent pas déjà exister en base', () => {
    // Si l'une d'elles existe déjà, l'exception est périmée : la migration
    // qui l'a créée aurait dû la faire sortir de la liste d'exception
    // ci-dessus pour qu'elle soit vérifiée comme une colonne normale.
    const colonnes = colonnesMigrees();
    for (const clé of RESTRICTED_FIELDS_SPRINT4) {
      expect(
        colonnes.has(clé),
        `${clé} existe déjà en base : retire-la de RESTRICTED_FIELDS_SPRINT4`,
      ).toBe(false);
    }
  });
});
