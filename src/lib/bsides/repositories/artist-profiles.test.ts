// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { createDb } from '@/lib/db';
import { runMigrations } from '../migrate';
import { createUser } from './admin-users';
import { createPerson, erasePerson } from './people';
import { createProfile, changeStatus, listForRole } from './artist-profiles';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'src/lib/bsides/migrations');

function ctx() {
  const db = createDb(':memory:');
  runMigrations(db, DIR);
  const actor = createUser(db, {
    email: 'sa@bgm.be', passwordHash: 'h', algo: 'scrypt',
    displayName: 'SA', roles: ['SUPER_ADMIN'],
  });
  return { db, actor };
}

describe('artist-profiles', () => {
  it('n\'expose jamais internal_notes à un ANALYST', () => {
    const { db, actor } = ctx();
    const p = createPerson(db, {
      email: 'a@x.be', firstName: 'A', lastName: 'Nom', displayName: 'Artiste A',
    });
    // Les notes internes sont portées par le PROFIL (spec §6.2), pas par la
    // personne : le §6.1 ne les y place pas.
    createProfile(db, {
      personId: p, slug: 'a', crmStatus: 'FOUND', actorUserId: actor, internalNotes: 'secret',
    });

    const vueAnalyste = listForRole(db, ['ANALYST']);
    expect(vueAnalyste[0]).not.toHaveProperty('internal_notes');
    expect(JSON.stringify(vueAnalyste)).not.toContain('secret');
    // Mais le nom d'usage, lui, est servi à tous : sans lui, l'écran de liste
    // du Sprint 2 afficherait des lignes anonymes.
    expect(vueAnalyste[0].display_name).toBe('Artiste A');

    const vueCurateur = listForRole(db, ['CURATOR']);
    expect(vueCurateur[0]).toHaveProperty('internal_notes');
    db.close();
  });

  it('trace un changement de statut, sans écrire l\'email en clair', () => {
    const { db, actor } = ctx();
    const p = createPerson(db, { email: 'a@x.be', firstName: 'A', lastName: 'Nom' });
    const a = createProfile(db, { personId: p, slug: 'a', crmStatus: 'FOUND', actorUserId: actor });
    changeStatus(db, { profileId: a, status: 'SCORED', actorUserId: actor });

    const audit = db
      .prepare("SELECT action, before, after FROM bsides_audit_log WHERE action = 'artist.status_changed'")
      .get() as { before: string; after: string };
    expect(JSON.parse(audit.before).crm_status).toBe('FOUND');
    expect(JSON.parse(audit.after).crm_status).toBe('SCORED');
    db.close();
  });

  it('rejette une clé étrangère invalide, sans profil ni trace', () => {
    const { db, actor } = ctx();
    expect(() =>
      createProfile(db, { personId: 'fantome', slug: 'x', crmStatus: 'FOUND', actorUserId: actor }),
    ).toThrow();
    expect(db.prepare('SELECT COUNT(*) c FROM bsides_audit_log').get()).toEqual({ c: 0 });
    db.close();
  });

  it('défait la mutation quand seul l\'audit échoue', () => {
    const { db } = ctx();
    const p = createPerson(db, { email: 'a@x.be', firstName: 'A', lastName: 'Nom' });
    // La personne existe : l'INSERT du profil réussira. C'est l'audit qui
    // échouera, sur un acteur qui n'existe pas — la preuve que la mutation
    // métier et son audit partagent le même sort, même quand c'est l'audit
    // qui échoue en second.
    expect(() =>
      createProfile(db, {
        personId: p, slug: 'a', crmStatus: 'FOUND', actorUserId: 'acteur-fantome',
      }),
    ).toThrow();
    // Le profil ne doit PAS subsister : c'est ce que withTransaction garantit.
    expect(db.prepare('SELECT COUNT(*) c FROM bsides_artist_profiles').get()).toEqual({ c: 0 });
    expect(db.prepare('SELECT COUNT(*) c FROM bsides_audit_log').get()).toEqual({ c: 0 });
    db.close();
  });

  it('erasePerson efface les données personnelles et laisse une trace', () => {
    const { db, actor } = ctx();
    const p = createPerson(db, {
      email: 'a@x.be', firstName: 'A', lastName: 'Nom', displayName: 'A. Artiste',
      phone: '+32', preferredLocale: 'fr', country: 'BE', city: 'Bruxelles',
      addressLine1: 'rue X 1', addressLine2: 'bte 2', postalCode: '1000',
    });
    erasePerson(db, p, actor);
    const row = db
      .prepare(
        `SELECT email, first_name, last_name, display_name, phone, preferred_locale,
                country, city, address_line1, address_line2, postal_code
           FROM bsides_people WHERE id = ?`,
      )
      .get(p);
    // Chaque colonne personnelle du §6.1, énumérée : une colonne ajoutée à la
    // table sans être ajoutée à l'effacement doit faire échouer ce test, pas
    // passer inaperçue.
    expect(row).toEqual({
      email: null, first_name: null, last_name: null, display_name: null,
      phone: null, preferred_locale: null, country: null, city: null,
      address_line1: null, address_line2: null, postal_code: null,
    });
    const trace = db.prepare("SELECT COUNT(*) c FROM bsides_audit_log WHERE action = 'person.erased'").get();
    expect(trace).toEqual({ c: 1 });
    db.close();
  });

  it('erasePerson emporte aussi les notes internes du profil et le portrait', () => {
    const { db, actor } = ctx();
    const p = createPerson(db, { email: 'a@x.be', firstName: 'A', lastName: 'Nom' });
    db.prepare(
      'INSERT INTO bsides_person_media (id, person_id, media_type, variant_role, storage_path, display_order, created_at) VALUES (?,?,?,?,?,?,?)',
    ).run('pm1', p, 'IMAGE', 'master', 'portraits/pm1.jpg', 0, 0);
    const a = createProfile(db, {
      personId: p, slug: 'a', crmStatus: 'FOUND', actorUserId: actor, internalNotes: 'secret',
    });
    db.prepare('UPDATE bsides_artist_profiles SET portrait_media_id = ? WHERE id = ?')
      .run('pm1', a);

    // Un master d'œuvre du même artiste : il ne doit PAS tomber. Droits
    // contractuels, régime de conservation opposé (§36) — c'est la raison
    // d'être des deux tables de médias.
    db.prepare(
      'INSERT INTO bsides_works (id, artist_profile_id, slug, title, work_type, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    ).run('w1', a, 'w', 'T', 'PAINTING', 0, 0);
    db.prepare(
      'INSERT INTO bsides_work_media (id, work_id, media_type, variant_role, storage_path, display_order, created_at) VALUES (?,?,?,?,?,?,?)',
    ).run('m1', 'w1', 'IMAGE', 'master', 'masters/m1.tif', 0, 0);

    erasePerson(db, p, actor);

    expect(
      db.prepare('SELECT internal_notes, portrait_media_id FROM bsides_artist_profiles WHERE id = ?').get(a),
    ).toEqual({ internal_notes: null, portrait_media_id: null });
    expect(db.prepare('SELECT COUNT(*) c FROM bsides_person_media WHERE person_id = ?').get(p))
      .toEqual({ c: 0 });
    expect(db.prepare('SELECT COUNT(*) c FROM bsides_work_media').get()).toEqual({ c: 1 });

    // Un effacement qui ne couvrirait pas ces champs serait partiel — donc
    // pire qu'absent, puisqu'il se croirait fait.
    const restes = listForRole(db, ['CURATOR']);
    expect(JSON.stringify(restes)).not.toContain('secret');
    db.close();
  });
});
