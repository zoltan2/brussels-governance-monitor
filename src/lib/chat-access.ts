// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Etat d'acces au chatbot, decide PAR LE SERVEUR.
 *
 * Avant le 21/09/2026, il n'existait aucun etat d'autorisation cote serveur :
 *   - le quota vivait dans le `localStorage` du navigateur ;
 *   - le niveau d'acces (`tier`) etait ENVOYE par le client et lu tel quel ;
 *   - l'acces payant etait accorde par la seule presence de `?chat_unlocked=1`
 *     dans l'URL, un lien partageable tel quel.
 * Le navigateur decidait donc s'il avait paye. Ce module remet la decision au
 * serveur : un cookie signe HMAC-SHA256, pose uniquement apres verification du
 * paiement aupres de Stripe (voir src/app/api/chat/unlock/route.ts).
 *
 * Le cookie reste une commodite de transport : il ne porte aucun secret, il est
 * signe, date, et il n'accorde rien d'autre que le niveau de prompt.
 */

export type ChatTier = 'free' | 'paid';

export const CHAT_ACCESS_COOKIE = 'bgm_chat_access_v2';

/** Duree de l'acces paye. Alignee sur ce que le widget promettait deja. */
const ACCESS_DAYS = 90;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is required to sign chat access. Set it in .env.local.');
  }
  return secret;
}

function sign(encoded: string): string {
  return createHmac('sha256', getSecret()).update(encoded).digest('base64url');
}

/**
 * Fabrique la valeur du cookie d'acces. `reference` est l'identifiant de session
 * Stripe : il ne sert pas a autoriser, seulement a tracer quelle transaction a
 * ouvert l'acces si une verification manuelle devient necessaire.
 */
export function mintChatAccess(reference: string): { value: string; maxAge: number } {
  const exp = Date.now() + ACCESS_DAYS * 24 * 60 * 60 * 1000;
  const data = JSON.stringify({ type: 'chat-access', ref: reference, exp });
  const encoded = Buffer.from(data).toString('base64url');
  return {
    value: `${encoded}.${sign(encoded)}`,
    maxAge: ACCESS_DAYS * 24 * 60 * 60,
  };
}

/**
 * Verifie une valeur de cookie. Rend `true` seulement si la signature est
 * valide ET la date de peremption future. Toute anomalie rend `false` : la
 * lecture echoue FERMEE, un cookie illisible ne vaut pas un acces.
 */
export function verifyChatAccess(value: string | undefined): boolean {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 2) return false;
  const [encoded, signature] = parts;

  try {
    const given = Buffer.from(signature, 'base64url');
    const expected = Buffer.from(sign(encoded), 'base64url');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  } catch {
    return false;
  }

  try {
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (data.type !== 'chat-access') return false;
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

/** Lit le niveau d'acces depuis les en-tetes de la requete. Jamais depuis le corps. */
export function readChatTier(headers: Headers): ChatTier {
  const cookieHeader = headers.get('cookie');
  if (!cookieHeader) return 'free';
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === CHAT_ACCESS_COOKIE) {
      return verifyChatAccess(rest.join('=')) ? 'paid' : 'free';
    }
  }
  return 'free';
}
