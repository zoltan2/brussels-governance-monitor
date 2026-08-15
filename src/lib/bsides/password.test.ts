// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { hashPassword, verifyPassword, dummyVerify, MIN_PASSWORD_LENGTH } from './password';

describe('password', () => {
  it('produit un hash vérifiable', async () => {
    const h = await hashPassword('correct horse battery');
    expect(await verifyPassword('correct horse battery', h, 'scrypt')).toBe(true);
    expect(await verifyPassword('mauvais', h, 'scrypt')).toBe(false);
  });

  it('produit un sel différent à chaque appel', async () => {
    expect(await hashPassword('même mot de passe')).not.toBe(
      await hashPassword('même mot de passe'),
    );
  });

  it('vérifie encore un hash bcrypt hérité', async () => {
    const legacy = bcrypt.hashSync('ancien', 10);
    expect(await verifyPassword('ancien', legacy, 'bcrypt')).toBe(true);
    expect(await verifyPassword('faux', legacy, 'bcrypt')).toBe(false);
  });

  it('ne lève jamais sur un hash mal formé', async () => {
    expect(await verifyPassword('x', 'pas-un-hash', 'scrypt')).toBe(false);
  });

  // Revue de branche du 2026-08-15, mineur #8 : `p` n'a pas de plafond
  // mémoire (contrairement à `N`/`r`, contraints par `maxmem`) — un `p` élevé
  // relu depuis la colonne coûte des dizaines de fois le temps nominal.
  it('refuse un hash dont p dépasse la borne, sans jamais calculer le coût correspondant', async () => {
    const salt = Buffer.alloc(16).toString('base64');
    const derivee = Buffer.alloc(64).toString('base64');
    const hashHostile = `scrypt$16384$8$999$${salt}$${derivee}`;
    expect(await verifyPassword('peu importe', hashHostile, 'scrypt')).toBe(false);
  });

  it('refuse aussi N et r hors bornes (défense en profondeur, au-delà du seul maxmem de Node)', async () => {
    const salt = Buffer.alloc(16).toString('base64');
    const derivee = Buffer.alloc(64).toString('base64');
    expect(await verifyPassword('x', `scrypt$99999999$8$1$${salt}$${derivee}`, 'scrypt')).toBe(false);
    expect(await verifyPassword('x', `scrypt$16384$999$1$${salt}$${derivee}`, 'scrypt')).toBe(false);
  });

  it('accepte toujours les paramètres nominaux produits par hashPassword', async () => {
    const h = await hashPassword('un mot de passe correct');
    expect(await verifyPassword('un mot de passe correct', h, 'scrypt')).toBe(true);
  });

  it('expose la longueur minimale exigée', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
  });

  it("dummyVerify coûte le même ordre de grandeur qu'une vraie vérification", async () => {
    const h = await hashPassword('un mot de passe correct');
    const t0 = performance.now();
    await verifyPassword('mauvais', h, 'scrypt');
    const vrai = performance.now() - t0;
    const t1 = performance.now();
    await dummyVerify();
    const faux = performance.now() - t1;
    // Bornes larges : on vérifie l'ordre de grandeur, pas une égalité — un test
    // de timing strict serait instable en CI.
    expect(faux).toBeGreaterThan(vrai / 5);
    expect(faux).toBeLessThan(vrai * 5);
  });
});
