// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Mots de passe — scrypt de node:crypto, asynchrone (spec §7.5).
 *
 * bcryptjs est du JavaScript pur : chaque vérification bloque le thread Node.
 * scrypt s'exécute dans le pool de threads de libuv, donc hors du chemin qui
 * sert les pages. Monter le coût de bcrypt aurait aggravé le problème.
 *
 * Format stocké : scrypt$N$r$p$sel_base64$dérivée_base64 — auto-descriptif,
 * pour qu'un changement de paramètres n'invalide pas les hashs existants.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import bcrypt from 'bcryptjs';

const scryptAsync = promisify(scrypt) as (
  password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number },
) => Promise<Buffer>;

const PARAMS = { N: 16384, r: 8, p: 1 };
const KEYLEN = 64;

export const MIN_PASSWORD_LENGTH = 12;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(plain, salt, KEYLEN, PARAMS);
  return [
    'scrypt', PARAMS.N, PARAMS.r, PARAMS.p,
    salt.toString('base64'), derived.toString('base64'),
  ].join('$');
}

async function verifyScrypt(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, derivedB64] = parts;
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(derivedB64, 'base64');
  const actual = await scryptAsync(plain, salt, expected.length, {
    N: Number(n), r: Number(r), p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function verifyPassword(
  plain: string, stored: string, algo: 'scrypt' | 'bcrypt',
): Promise<boolean> {
  try {
    return algo === 'bcrypt'
      ? await bcrypt.compare(plain, stored)
      : await verifyScrypt(plain, stored);
  } catch {
    return false;
  }
}

/** Vérification factice pour un email inconnu : MÊME algorithme, MÊMES
 * paramètres. Un hash bidon bon marché ne compenserait rien — l'écart de durée
 * révélerait l'existence du compte (spec §7.5). */
export async function dummyVerify(): Promise<void> {
  await scryptAsync('mot de passe factice', randomBytes(16), KEYLEN, PARAMS);
}
