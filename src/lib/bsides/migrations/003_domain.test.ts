// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDb } from '@/lib/db';
import { runMigrations } from '../migrate';
import { CRM_STATUSES, WORK_TYPES } from '../schema';

const DIR = join(process.cwd(), 'src/lib/bsides/migrations');
const SQL_FILE = join(DIR, '003_domain.sql');

function migrated() {
  const db = createDb(':memory:');
  runMigrations(db, DIR);
  return db;
}

describe('003_domain', () => {
  it('refuse un statut CRM hors liste', () => {
    const db = migrated();
    db.prepare('INSERT INTO bsides_people (id, created_at, updated_at) VALUES (?,?,?)')
      .run('p1', 0, 0);
    expect(() =>
      db.prepare(
        'INSERT INTO bsides_artist_profiles (id, person_id, slug, crm_status, created_at, updated_at) VALUES (?,?,?,?,?,?)',
      ).run('a1', 'p1', 'nom-artiste', 'INVENTE', 0, 0),
    ).toThrow();
    db.close();
  });

  it('refuse un profil rattaché à une personne inexistante', () => {
    const db = migrated();
    expect(() =>
      db.prepare(
        'INSERT INTO bsides_artist_profiles (id, person_id, slug, crm_status, created_at, updated_at) VALUES (?,?,?,?,?,?)',
      ).run('a1', 'fantome', 's', 'discovered', 0, 0),
    ).toThrow();
    db.close();
  });

  it('refuse deux personnes dont les emails ne diffèrent que par la casse', () => {
    const db = migrated();
    const ins = db.prepare(
      'INSERT INTO bsides_people (id, email, created_at, updated_at) VALUES (?,?,?,?)',
    );
    ins.run('p1', 'artiste@x.be', 0, 0);
    expect(() => ins.run('p2', 'Artiste@X.be', 0, 0)).toThrow();
    db.close();
  });

  it('refuse une recommandation sans recommandeur artiste ni personne', () => {
    const db = migrated();
    db.prepare('INSERT INTO bsides_people (id, created_at, updated_at) VALUES (?,?,?)').run('p1', 0, 0);
    db.prepare(
      'INSERT INTO bsides_artist_profiles (id, person_id, slug, crm_status, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    ).run('a1', 'p1', 's', 'discovered', 0, 0);
    expect(() =>
      db.prepare(
        'INSERT INTO bsides_artist_recommendations (id, recommended_profile_id, by_artist_profile_id, by_person_id, created_at) VALUES (?,?,?,?,?)',
      ).run('r1', 'a1', null, null, 0),
    ).toThrow();
    db.close();
  });

  it('accepte une recommandation avec un seul recommandeur renseigné', () => {
    const db = migrated();
    db.prepare('INSERT INTO bsides_people (id, created_at, updated_at) VALUES (?,?,?)').run('p1', 0, 0);
    db.prepare(
      'INSERT INTO bsides_artist_profiles (id, person_id, slug, crm_status, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    ).run('a1', 'p1', 's', 'discovered', 0, 0);
    const ins = db.prepare(
      'INSERT INTO bsides_artist_recommendations (id, recommended_profile_id, by_artist_profile_id, by_person_id, created_at) VALUES (?,?,?,?,?)',
    );
    expect(() => ins.run('r-par-artiste', 'a1', 'a1', null, 0)).not.toThrow();
    expect(() => ins.run('r-par-personne', 'a1', null, 'p1', 0)).not.toThrow();
    db.close();
  });

  it('accepte les types d\'œuvre non visuels', () => {
    const db = migrated();
    const ins = db.prepare(
      'INSERT INTO bsides_works (id, slug, title, work_type, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    );
    for (const t of ['MUSIC', 'SOUND', 'PERFORMANCE', 'TEXT']) {
      expect(() => ins.run(`w-${t}`, `s-${t}`, 'T', t, 0, 0)).not.toThrow();
    }
    db.close();
  });

  it('rend un média privé par défaut', () => {
    const db = migrated();
    db.prepare(
      'INSERT INTO bsides_works (id, slug, title, work_type, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    ).run('w1', 's', 'T', 'PAINTING', 0, 0);
    db.prepare(
      'INSERT INTO bsides_work_media (id, work_id, kind, storage_path, display_order, created_at) VALUES (?,?,?,?,?,?)',
    ).run('m1', 'w1', 'master', 'masters/m1.tif', 0, 0);
    expect(db.prepare('SELECT public FROM bsides_work_media WHERE id = ?').get('m1'))
      .toEqual({ public: 0 });
    db.close();
  });

  it('borne chacun des huit critères de scoring', () => {
    const db = migrated();
    db.prepare('INSERT INTO bsides_people (id, created_at, updated_at) VALUES (?,?,?)').run('p1', 0, 0);
    db.prepare(
      'INSERT INTO bsides_artist_profiles (id, person_id, slug, crm_status, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    ).run('a1', 'p1', 's', 'discovered', 0, 0);

    // Valeurs valides pour chaque critère, qu'on dépassera une à une.
    const critères = {
      artistic_quality: 10, originality: 10, brussels_connection: 10,
      storytelling: 10, b_sides_fit: 10,
      portfolio_quality: 5, communication: 5, reliability: 5,
    } as const;
    const colonnes = Object.keys(critères).join(', ');
    const trous = Object.keys(critères).map(() => '?').join(', ');
    const insert = db.prepare(
      `INSERT INTO bsides_artist_scores (id, artist_profile_id, ${colonnes}, created_at)
       VALUES (?, ?, ${trous}, ?)`,
    );

    // Une ligne entièrement valide passe.
    expect(() =>
      insert.run('s-ok', 'a1', ...Object.values(critères), 0),
    ).not.toThrow();

    // Chaque critère, dépassé d'un point au-dessus de son maximum, est rejeté.
    // Une boucle plutôt qu'un seul cas : une borne oubliée sur un critère
    // passerait sinon inaperçue.
    for (const [nom, max] of Object.entries(critères)) {
      const valeurs = { ...critères, [nom]: max + 1 };
      expect(() =>
        insert.run(`s-${nom}-haut`, 'a1', ...Object.values(valeurs), 0),
        `le critère ${nom} devrait refuser ${max + 1}`,
      ).toThrow();
    }

    // Même chose sous le minimum (-1). Une CHECK qui n'aurait gardé que la
    // borne haute (`<= max` au lieu de `BETWEEN 0 AND max`) passerait la
    // boucle précédente sans être détectée : il faut éprouver les deux bornes.
    for (const nom of Object.keys(critères)) {
      const valeurs = { ...critères, [nom]: -1 };
      expect(() =>
        insert.run(`s-${nom}-bas`, 'a1', ...Object.values(valeurs), 0),
        `le critère ${nom} devrait refuser -1`,
      ).toThrow();
    }
    db.close();
  });

  it('refuse un booléen hors 0/1 pour chacun des trois indicateurs', () => {
    const db = migrated();
    db.prepare('INSERT INTO bsides_people (id, created_at, updated_at) VALUES (?,?,?)').run('p1', 0, 0);
    db.prepare(
      'INSERT INTO bsides_artist_profiles (id, person_id, slug, crm_status, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    ).run('a1', 'p1', 's', 'discovered', 0, 0);
    const base =
      'INSERT INTO bsides_artist_scores (id, artist_profile_id, artistic_quality, originality, brussels_connection, storytelling, b_sides_fit, portfolio_quality, communication, reliability, homepage_test, proud_to_present, tells_something, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    const insert = db.prepare(base);

    const booléens = { homepage_test: 0, proud_to_present: 0, tells_something: 0 } as const;

    // Chaque indicateur, mis à 2, est rejeté. Une boucle plutôt que trois cas
    // recopiés : un indicateur oublié dans la CHECK passerait sinon inaperçu.
    for (const nom of Object.keys(booléens) as (keyof typeof booléens)[]) {
      const valeurs = { ...booléens, [nom]: 2 };
      expect(() =>
        insert.run(
          `s-${nom}`, 'a1', 5, 5, 5, 5, 5, 3, 3, 3,
          valeurs.homepage_test, valeurs.proud_to_present, valeurs.tells_something, 0,
        ),
        `l'indicateur ${nom} devrait refuser 2`,
      ).toThrow();
    }
    db.close();
  });

  it('accepte un total absent', () => {
    const db = migrated();
    db.prepare('INSERT INTO bsides_people (id, created_at, updated_at) VALUES (?,?,?)').run('p1', 0, 0);
    db.prepare(
      'INSERT INTO bsides_artist_profiles (id, person_id, slug, crm_status, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    ).run('a1', 'p1', 's', 'discovered', 0, 0);
    const base =
      'INSERT INTO bsides_artist_scores (id, artist_profile_id, artistic_quality, originality, brussels_connection, storytelling, b_sides_fit, portfolio_quality, communication, reliability';

    // calculated_total nullable : la formule de pondération n'est pas tranchée.
    expect(() =>
      db.prepare(`${base}, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
        .run('s2', 'a1', 5, 5, 5, 5, 5, 3, 3, 3, 0),
    ).not.toThrow();
    expect(
      db.prepare('SELECT calculated_total FROM bsides_artist_scores WHERE id = ?').get('s2'),
    ).toEqual({ calculated_total: null });
    db.close();
  });

  it('la clause CHECK(crm_status) du SQL concorde avec CRM_STATUSES de schema.ts, dans les deux sens', () => {
    const sql = readFileSync(SQL_FILE, 'utf8');
    const match = sql.match(/CHECK\s*\(\s*crm_status\s+IN\s*\(([^)]*)\)\s*\)/);
    expect(match, 'clause CHECK(crm_status IN (...)) introuvable dans 003_domain.sql').not.toBeNull();

    const statusesInSql = (match as RegExpMatchArray)[1]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s.replace(/^'|'$/g, ''));

    // Sens 1 : chaque statut de CRM_STATUSES doit figurer dans la clause CHECK
    // du SQL — un statut déclaré côté code mais absent de la migration serait
    // rejeté en base sans que le code ne le sache.
    for (const status of CRM_STATUSES) {
      expect(statusesInSql).toContain(status);
    }

    // Sens 2 : aucune valeur de la clause CHECK ne doit être absente de
    // CRM_STATUSES — un test qui ne vérifierait que le sens 1 laisserait
    // passer un statut fantôme, accepté en base mais inconnu du code
    // applicatif.
    for (const status of statusesInSql) {
      expect(CRM_STATUSES as readonly string[]).toContain(status);
    }

    expect(statusesInSql.length).toBe(CRM_STATUSES.length);
  });

  it('la clause CHECK(work_type) du SQL concorde avec WORK_TYPES de schema.ts, dans les deux sens', () => {
    const sql = readFileSync(SQL_FILE, 'utf8');
    const match = sql.match(/CHECK\s*\(\s*work_type\s+IN\s*\(([^)]*)\)\s*\)/);
    expect(match, 'clause CHECK(work_type IN (...)) introuvable dans 003_domain.sql').not.toBeNull();

    const typesInSql = (match as RegExpMatchArray)[1]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s.replace(/^'|'$/g, ''));

    // Sens 1 : chaque type de WORK_TYPES doit figurer dans la clause CHECK du
    // SQL — un type déclaré côté code mais absent de la migration serait
    // rejeté en base sans que le code ne le sache.
    for (const type of WORK_TYPES) {
      expect(typesInSql).toContain(type);
    }

    // Sens 2 : aucune valeur de la clause CHECK ne doit être absente de
    // WORK_TYPES — un test qui ne vérifierait que le sens 1 laisserait passer
    // un type fantôme, accepté en base mais inconnu du code applicatif.
    for (const type of typesInSql) {
      expect(WORK_TYPES as readonly string[]).toContain(type);
    }

    expect(typesInSql.length).toBe(WORK_TYPES.length);
  });
});
