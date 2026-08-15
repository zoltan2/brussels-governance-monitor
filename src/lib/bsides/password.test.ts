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
