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

/**
 * Bornes sur les paramètres scrypt RELUS depuis un hash stocké (format
 * auto-descriptif, voir en-tête). `N` et `r` sont déjà contraints
 * indirectement par le `maxmem` par défaut de `node:crypto` (32 Mio :
 * `scrypt` rejette tout `(N, r)` qui le dépasserait avec
 * `ERR_CRYPTO_INVALID_SCRYPT_PARAMS`, capté par le `try/catch` de
 * `verifyPassword` → `false`). `p` NE L'EST PAS : c'est un multiplicateur
 * linéaire du temps de calcul sans plafond mémoire — un `p` élevé coûte des
 * dizaines de fois le temps nominal (mesuré : `p=64` → ×51) pour un coût
 * mémoire inchangé, donc invisible à `maxmem`.
 *
 * Bornées explicitement plutôt que documentées seules (revue de branche du
 * 2026-08-15, mineur #8) : le coût d'un contrôle de plage est nul, et bien
 * qu'aucun chemin actuel n'écrive `password_hash` autrement que via
 * `hashPassword` (donc toujours avec `PARAMS` ci-dessus), l'invariant «
 * `password_hash` n'est jamais lu comme donnée fiable sans borne » doit tenir
 * indépendamment de qui écrit la colonne aujourd'hui — pas seulement être
 * vrai par construction du code actuel. Marge généreuse au-dessus de `PARAMS`
 * pour ne jamais invalider un hash légitime après un futur changement de coût
 * (mineur #9 du même registre envisage `N = 2^17`).
 */
const MAX_N = 2 ** 17; // 131072 — voir mineur #9 : la valeur à laquelle le coût pourrait monter.
const MAX_R = 16; // PARAMS.r vaut 8 aujourd'hui.
const MAX_P = 16; // PARAMS.p vaut 1 aujourd'hui ; ×16 nominal reste un surcoût borné, pas ×51+.

function paramètresDansLesBornes(n: number, r: number, p: number): boolean {
  return (
    Number.isInteger(n) && n >= 2 && n <= MAX_N
    && Number.isInteger(r) && r >= 1 && r <= MAX_R
    && Number.isInteger(p) && p >= 1 && p <= MAX_P
  );
}

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
  const N = Number(n), R = Number(r), P = Number(p);
  if (!paramètresDansLesBornes(N, R, P)) return false;
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(derivedB64, 'base64');
  const actual = await scryptAsync(plain, salt, expected.length, { N, r: R, p: P });
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
