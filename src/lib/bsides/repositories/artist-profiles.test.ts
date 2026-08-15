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
      email: 'a@x.be', legalName: 'A', displayName: 'Artiste A', internalNotes: 'secret',
    });
    createProfile(db, { personId: p, slug: 'a', crmStatus: 'discovered', actorUserId: actor });

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
    const p = createPerson(db, { email: 'a@x.be', legalName: 'A' });
    const a = createProfile(db, { personId: p, slug: 'a', crmStatus: 'discovered', actorUserId: actor });
    changeStatus(db, { profileId: a, status: 'qualified', actorUserId: actor });

    const audit = db
      .prepare("SELECT action, before, after FROM bsides_audit_log WHERE action = 'artist.status_changed'")
      .get() as { before: string; after: string };
    expect(JSON.parse(audit.before).crm_status).toBe('discovered');
    expect(JSON.parse(audit.after).crm_status).toBe('qualified');
    db.close();
  });

  it('ne laisse ni profil ni trace quand la mutation échoue', () => {
    const { db, actor } = ctx();
    expect(() =>
      createProfile(db, { personId: 'fantome', slug: 'x', crmStatus: 'discovered', actorUserId: actor }),
    ).toThrow();
    expect(db.prepare('SELECT COUNT(*) c FROM bsides_audit_log').get()).toEqual({ c: 0 });
    db.close();
  });

  it('erasePerson efface les données personnelles et laisse une trace', () => {
    const { db, actor } = ctx();
    const p = createPerson(db, { email: 'a@x.be', legalName: 'A', internalNotes: 'n' });
    erasePerson(db, p, actor);
    const row = db.prepare('SELECT email, legal_name, internal_notes FROM bsides_people WHERE id = ?').get(p);
    expect(row).toEqual({ email: null, legal_name: null, internal_notes: null });
    const trace = db.prepare("SELECT COUNT(*) c FROM bsides_audit_log WHERE action = 'person.erased'").get();
    expect(trace).toEqual({ c: 1 });
    db.close();
  });
});
