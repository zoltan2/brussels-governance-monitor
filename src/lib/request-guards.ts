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
 * `Content-Length` est declaratif : un appelant peut mentir ou l'omettre (envoi
 * en `Transfer-Encoding: chunked`). Ce garde ecarte donc le cas franc a cout
 * nul, AVANT de lire le flux, mais il ne suffit pas seul : la lecture elle-meme
 * doit passer par `readTextCapped` ou `readJsonCapped`, qui comptent les octets
 * reellement recus (revue red team du 28/09).
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

/** Issue d'une lecture plafonnee : le texte, ou le statut HTTP a renvoyer. */
export type LectureCorps<T> =
  | { ok: true; value: T }
  | { ok: false; status: 400 | 413; error: string };

/**
 * Lit le corps en comptant les octets RECUS, et coupe des que `max` est depasse.
 *
 * `request.json()` et `request.text()` mettent tout le flux en tampon, quel que
 * soit le `Content-Length` annonce. Ici, au premier octet de trop, le flux est
 * annule et la memoire allouee ne depasse jamais `max` plus un morceau.
 * Le garde declaratif est applique d'abord : un `Content-Length` trop grand est
 * refuse sans lire un seul octet.
 */
export async function readTextCapped(
  request: Request,
  max: number = TAILLE_CORPS_MAX,
): Promise<LectureCorps<string>> {
  if (bodyTooLargeRefusal(request.headers, max)) {
    return { ok: false, status: 413, error: 'Payload too large' };
  }
  if (!request.body) return { ok: true, value: '' };

  const lecteur = request.body.getReader();
  const morceaux: Uint8Array[] = [];
  let recus = 0;
  try {
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      recus += value.byteLength;
      if (recus > max) {
        await lecteur.cancel().catch(() => {});
        return { ok: false, status: 413, error: 'Payload too large' };
      }
      morceaux.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: 'Invalid body' };
  }

  const tout = new Uint8Array(recus);
  let position = 0;
  for (const m of morceaux) {
    tout.set(m, position);
    position += m.byteLength;
  }
  return { ok: true, value: new TextDecoder().decode(tout) };
}

/** Comme `readTextCapped`, puis `JSON.parse` : 400 si le JSON est invalide. */
export async function readJsonCapped(
  request: Request,
  max: number = TAILLE_CORPS_MAX,
): Promise<LectureCorps<unknown>> {
  const texte = await readTextCapped(request, max);
  if (!texte.ok) return texte;
  try {
    return { ok: true, value: JSON.parse(texte.value) as unknown };
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON' };
  }
}
