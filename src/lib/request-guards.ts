// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Gardes communes aux routes publiques.
 *
 * `request.json()` met l'INTEGRALITE du corps en tampon avant que la validation
 * ne voie quoi que ce soit. Le routeur App de Next.js n'applique aucune limite
 * par defaut : la limite de 4 Mo que l'on croit connaitre appartient a l'ancien
 * routeur Pages, absent de ce depot. Aucune limite n'etait posee non plus dans
 * `next.config.ts`, et aucun Caddyfile n'est versionne.
 *
 * Consequence mesuree a l'audit du 21/09 : un corps JSON valide de plusieurs
 * centaines de Mo, envoye depuis quelques adresses, faisait allouer puis tuer le
 * processus Node. Le cout de l'attaque etait la bande passante de l'attaquant.
 */

/** 64 Kio : trois ordres de grandeur au-dessus du plus gros formulaire du site. */
export const TAILLE_CORPS_MAX = 64 * 1024;

/**
 * Rend un motif de refus si le corps annonce est trop gros, `null` sinon.
 *
 * `Content-Length` est declaratif : un appelant peut mentir ou l'omettre. Ce
 * garde ecarte donc le cas franc a cout nul, AVANT de lire le flux. Il ne
 * remplace pas une limite posee dans le proxy (`request_body { max_size }` cote
 * Caddy), qui est la seule a s'appliquer quoi que l'appelant declare.
 */
export function bodyTooLargeRefusal(
  headers: Headers,
  max: number = TAILLE_CORPS_MAX,
): string | null {
  const brut = headers.get('content-length');
  if (!brut) return null;
  const taille = Number(brut);
  if (!Number.isFinite(taille)) return null;
  return taille > max ? 'Payload too large' : null;
}
