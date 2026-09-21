// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { createHmac, randomBytes } from 'node:crypto';

/**
 * Journalisation sans donnees personnelles.
 *
 * Plusieurs routes ecrivaient l'adresse email de l'abonne en clair dans
 * `console.error` sur leurs chemins d'erreur. Ces journaux partent dans la
 * sortie standard du conteneur, reprise par journald sur l'hote, sans retention
 * documentee. Or le depot fait deja la bonne chose ailleurs
 * (`src/app/api/chat/feedback/route.ts` journalise `hasEmail: Boolean(email)`).
 *
 * Ce module donne un pseudonyme STABLE et NON REVERSIBLE : deux lignes de
 * journal concernant la meme personne se recoupent, sans que le journal ne
 * contienne jamais son adresse.
 */

/**
 * Sel de repli, tire une fois par processus.
 *
 * Contrairement a `token.ts` ou a la telemetrie du chat, ce module ne doit
 * JAMAIS lever : il sert sur des chemins d'erreur, ou une exception masquerait
 * l'incident qu'on essaie de journaliser. En l'absence d'AUTH_SECRET, les
 * pseudonymes restent correlables a l'interieur d'une execution et deviennent
 * inutilisables apres un redemarrage. C'est exactement ce qu'on veut : jamais de
 * constante publique, jamais d'exception.
 */
const SEL_DE_REPLI = randomBytes(32).toString('hex');

/** Pseudonyme court et stable d'une adresse email, pour les journaux. */
export function pseudonymeEmail(email: string | undefined | null): string {
  if (!email) return 'sans-email';
  const secret = process.env.AUTH_SECRET || SEL_DE_REPLI;
  return (
    'e:' +
    createHmac('sha256', secret).update(email.toLowerCase().trim()).digest('hex').slice(0, 10)
  );
}
