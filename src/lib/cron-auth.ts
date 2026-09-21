// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time check of the `Authorization: Bearer CRON_SECRET` header.
 * Plain `!==` comparison leaks timing information proportional to how many
 * leading characters match; negligible over HTTPS in practice, but a
 * standard-practice fix for a secret comparison.
 */
export function isValidCronAuth(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get('authorization') ?? '';
  return secretCorrespond(authHeader, `Bearer ${cronSecret}`);
}

/**
 * Compare deux secrets a temps constant.
 *
 * ECHEC FERME par construction : un `attendu` absent rend `false`. C'est la
 * propriete qui compte le plus ici — une variable d'environnement qui saute doit
 * fermer la porte, jamais l'ouvrir.
 *
 * Extrait le 21/09/2026 parce que `intel-inbox` comparait son jeton avec `!==`
 * alors que ce fichier et `token.ts` faisaient deja la bonne chose. Deux regles
 * de securite ecrites deux fois divergent au premier correctif applique a une
 * seule des deux.
 */
export function secretCorrespond(fourni: string, attendu: string | undefined): boolean {
  if (!attendu) return false;
  const a = Buffer.from(fourni);
  const b = Buffer.from(attendu);
  // `timingSafeEqual` exige des longueurs egales ; la comparer d'abord divulgue
  // la longueur du secret, ce qui est sans consequence pratique.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
