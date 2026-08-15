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

  it('ne journalise pas le slug en clair : il est dérivé du nom, et le journal est immuable', () => {
    const { db, actor } = ctx();
    const p = createPerson(db, {
      email: 'sr@x.be', firstName: 'Salomé', lastName: 'Rey', displayName: 'Salomé Rey',
    });
    // Le slug que le Sprint 2 fabriquera depuis le nom : `slugifier('Salomé
    // Rey')`. C'est la seule valeur nominative qui entrait dans
    // `bsides_audit_log`, table sans UPDATE ni DELETE — donc la seule que
    // `erasePerson` ne pouvait pas rattraper.
    const a = createProfile(db, {
      personId: p, slug: 'salome-rey', crmStatus: 'FOUND', actorUserId: actor,
    });

    const audit = db
      .prepare("SELECT before, after FROM bsides_audit_log WHERE action = 'artist.created'")
      .get() as { before: string; after: string };

    expect(audit.after).not.toContain('salome-rey');
    expect(audit.after).not.toContain('salome');
    expect(JSON.parse(audit.after).slug).toBe('[modifié]');
    // Contre-épreuve : le NOM du champ reste journalisé, et la colonne non
    // personnelle du même diff reste en clair. Sans elle, un `maskPersonal`
    // qui viderait l'objet entier — ou un `createProfile` qui cesserait
    // d'écrire `after` — passerait les trois assertions ci-dessus.
    expect(Object.keys(JSON.parse(audit.after)).sort()).toEqual(['crm_status', 'slug']);
    expect(JSON.parse(audit.after).crm_status).toBe('FOUND');

    // Et l'effacement, lui, reste sans effet sur le journal : c'est bien en
    // AMONT que la valeur devait être arrêtée.
    erasePerson(db, p, actor);
    const apres = db
      .prepare("SELECT after FROM bsides_audit_log WHERE action = 'artist.created'")
      .get() as { after: string };
    expect(apres.after).not.toContain('salome');
    expect(a).toBeTruthy();
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

  it('erasePerson emporte TOUTES les colonnes nominatives du profil, sans casser le slug ni l\'attribution des œuvres', () => {
    const { db, actor } = ctx();
    const p = createPerson(db, { email: 'a@x.be', firstName: 'A', lastName: 'Nom' });
    db.prepare(
      'INSERT INTO bsides_person_media (id, person_id, media_type, variant_role, storage_path, display_order, created_at) VALUES (?,?,?,?,?,?,?)',
    ).run('pm1', p, 'IMAGE', 'master', 'portraits/pm1.jpg', 0, 0);
    const a = createProfile(db, {
      personId: p, slug: 'jean-dupont', crmStatus: 'FOUND', actorUserId: actor,
      artistName: 'Jean Dupont', internalNotes: 'secret',
    });
    db.prepare('UPDATE bsides_artist_profiles SET portrait_media_id = ? WHERE id = ?')
      .run('pm1', a);

    // Un master d'œuvre du même artiste, avec sa mention de droit nominative :
    // il ne doit PAS tomber, ni perdre son attribution. Droits contractuels,
    // régime de conservation opposé (§36) — c'est la raison d'être des deux
    // tables de médias, et de la survie du profil lui-même.
    db.prepare(
      'INSERT INTO bsides_works (id, artist_profile_id, slug, title, work_type, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    ).run('w1', a, 'w', 'Titre de l\'œuvre', 'PAINTING', 0, 0);
    db.prepare(
      `INSERT INTO bsides_work_media
         (id, work_id, media_type, variant_role, storage_path, copyright_credit, display_order, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
    ).run('m1', 'w1', 'IMAGE', 'master', 'masters/m1.tif', '© Jean Dupont', 0, 0);

    erasePerson(db, p, actor);

    // Toutes les colonnes nominatives du profil, en un seul relevé : une
    // colonne oubliée doit faire échouer ce test, pas passer inaperçue — c'est
    // exactement ainsi qu'`artist_name` et `slug` avaient été manqués la
    // première fois (le test précédent n'en vérifiait que deux).
    const profil = db
      .prepare('SELECT artist_name, slug, internal_notes, portrait_media_id FROM bsides_artist_profiles WHERE id = ?')
      .get(a) as { artist_name: string | null; slug: string; internal_notes: string | null; portrait_media_id: string | null };
    expect(profil.artist_name).toBeNull();
    expect(profil.internal_notes).toBeNull();
    expect(profil.portrait_media_id).toBeNull();
    // Le slug ne peut pas être NULL (NOT NULL UNIQUE) : il doit devenir un nom
    // figé, dérivé de l'id de la ligne — jamais du nom de la personne, jamais
    // devinable, jamais l'ancien slug public.
    expect(profil.slug).toBe(`erased-${a}`);
    expect(profil.slug).not.toBe('jean-dupont');
    expect(profil.slug).not.toContain('jean');
    expect(profil.slug).not.toContain('dupont');

    expect(db.prepare('SELECT COUNT(*) c FROM bsides_person_media WHERE person_id = ?').get(p))
      .toEqual({ c: 0 });

    // L'œuvre et son média survivent intégralement — titre, attribution à ce
    // même profil, ET la mention de droit nominative sur le média : c'est le
    // contenu éditorial et contractuel que l'effacement ne doit PAS toucher.
    const oeuvre = db.prepare('SELECT artist_profile_id, title FROM bsides_works WHERE id = ?').get('w1');
    expect(oeuvre).toEqual({ artist_profile_id: a, title: 'Titre de l\'œuvre' });
    const media = db.prepare('SELECT copyright_credit FROM bsides_work_media WHERE id = ?').get('m1');
    expect(media).toEqual({ copyright_credit: '© Jean Dupont' });
    expect(db.prepare('SELECT COUNT(*) c FROM bsides_work_media').get()).toEqual({ c: 1 });

    // Un effacement qui ne couvrirait pas ces champs serait partiel — donc
    // pire qu'absent, puisqu'il se croirait fait. Le nom d'usage et l'ancien
    // slug ne doivent plus apparaître nulle part dans la vue CRM.
    const restes = listForRole(db, ['CURATOR']);
    const dump = JSON.stringify(restes);
    expect(dump).not.toContain('secret');
    expect(dump).not.toContain('Jean Dupont');
    expect(dump).not.toContain('jean-dupont');
    db.close();
  });
});
