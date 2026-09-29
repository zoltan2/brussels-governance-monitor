// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Registre des désabonnements (décision RGPD du 29/09/2026) : empreinte
 * d'adresse et table SQLite. Les routes qui s'en servent ont leurs propres
 * tests (cron contacts-purge, confirmation).
 */
import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { createDb } from './db';
import {
  fingerprintEmail,
  noterDesabonnement,
  lireDesabonnement,
  marquerContactSupprime,
  effacerDesabonnement,
  limiteConservationEmpreinte,
  compterDesabonnementsExpires,
  purgerDesabonnementsExpires,
  JOUR_MS,
} from './desabonnements';

const SECRET = 'secret-de-test';

describe('fingerprintEmail', () => {
  it('est stable pour une même adresse et un même secret', () => {
    expect(fingerprintEmail('lecteur@example.org', SECRET)).toBe(
      fingerprintEmail('lecteur@example.org', SECRET),
    );
  });

  it('ignore la casse et les espaces de bord', () => {
    expect(fingerprintEmail('  Lecteur@Example.ORG ', SECRET)).toBe(
      fingerprintEmail('lecteur@example.org', SECRET),
    );
  });

  it('distingue deux adresses', () => {
    expect(fingerprintEmail('a@example.org', SECRET)).not.toBe(
      fingerprintEmail('b@example.org', SECRET),
    );
  });

  it('change avec le secret : un nouveau secret ne reconnaît plus les anciennes empreintes', () => {
    expect(fingerprintEmail('lecteur@example.org', SECRET)).not.toBe(
      fingerprintEmail('lecteur@example.org', 'autre-secret'),
    );
  });

  it("ne contient pas l'adresse et fait 64 caractères hexadécimaux", () => {
    const e = fingerprintEmail('lecteur@example.org', SECRET);
    expect(e).toMatch(/^[0-9a-f]{64}$/);
    expect(e).not.toContain('lecteur');
  });

  it('est séparée par domaine : ce n’est pas le HMAC brut avec AUTH_SECRET', () => {
    // Le pseudonyme des journaux (log-safe.ts) hache la même adresse avec
    // AUTH_SECRET brut : les deux ne doivent jamais coïncider.
    const brut = createHmac('sha256', SECRET).update('lecteur@example.org').digest('hex');
    expect(fingerprintEmail('lecteur@example.org', SECRET)).not.toBe(brut);
  });

  it('lève sans secret plutôt que de tirer une clé au hasard', () => {
    expect(() => fingerprintEmail('lecteur@example.org', '')).toThrow(/AUTH_SECRET/);
  });
});

describe('table desabonnements', () => {
  it('note un désabonnement sans jamais écraser la première date', () => {
    const db = createDb(':memory:');
    expect(noterDesabonnement(db, 'e1', 1000)).toBe(true);
    expect(noterDesabonnement(db, 'e1', 9000)).toBe(false);
    expect(lireDesabonnement(db, 'e1')).toEqual({
      empreinte: 'e1',
      desabonne_le: 1000,
      contact_supprime_le: null,
    });
  });

  it('note la suppression du contact, puis efface la ligne', () => {
    const db = createDb(':memory:');
    noterDesabonnement(db, 'e1', 1000);
    marquerContactSupprime(db, 'e1', 5000);
    expect(lireDesabonnement(db, 'e1')?.contact_supprime_le).toBe(5000);
    expect(effacerDesabonnement(db, 'e1')).toBe(true);
    expect(lireDesabonnement(db, 'e1')).toBeNull();
    expect(effacerDesabonnement(db, 'e1')).toBe(false);
  });

  it('compte puis purge les lignes de plus de 24 mois, et elles seules', () => {
    const db = createDb(':memory:');
    const maintenant = Date.UTC(2026, 8, 29);
    const limite = limiteConservationEmpreinte(maintenant);
    expect(new Date(limite).toISOString().slice(0, 10)).toBe('2024-09-29');

    noterDesabonnement(db, 'vieille', limite - JOUR_MS);
    noterDesabonnement(db, 'recente', limite + JOUR_MS);

    expect(compterDesabonnementsExpires(db, limite)).toBe(1);
    expect(lireDesabonnement(db, 'vieille')).not.toBeNull();
    expect(purgerDesabonnementsExpires(db, limite)).toBe(1);
    expect(lireDesabonnement(db, 'vieille')).toBeNull();
    expect(lireDesabonnement(db, 'recente')).not.toBeNull();
  });
});
