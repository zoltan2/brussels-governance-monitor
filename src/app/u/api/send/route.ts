// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { clientIp } from '@/lib/client-ip';
import { readTextCapped } from '@/lib/request-guards';

/**
 * Relais des evenements du traceur Umami : `POST /u/api/send` et RIEN d'autre.
 *
 * Avant le 28/09/2026, `next.config.ts` reecrivait `/u/api/:path*` vers toute
 * l'API d'Umami : `/u/api/me`, `/u/api/auth/login`, l'administration entiere
 * repondait sous governance.brussels. Une reecriture externe relaie aussi TOUS
 * les en-tetes (httpxy, `proxy-request.js`), cookies du site compris, dont la
 * session d'administration Auth.js (revue red team).
 *
 * Ce relais ne transmet que ce dont Umami a besoin :
 *  - le corps (plafonne : un evenement pese quelques centaines d'octets) ;
 *  - `User-Agent` (navigateur, systeme, appareil) ;
 *  - l'adresse du visiteur en `X-Forwarded-For` (pays), tiree de `clientIp` ;
 *  - `x-umami-cache`, le jeton de session que le traceur renvoie a chaque envoi.
 * Jamais `Cookie`, jamais `Authorization`.
 *
 * ⚠️ EN PRODUCTION, CE CODE NE TOURNE PAS : Caddy intercepte `/u/*` avant
 * l'application et l'envoie directement au conteneur Umami (correctif du
 * 04/08/2026 contre la geolocalisation « tout en Allemagne »). Ce relais sert au
 * developpement et a tout deploiement sans ce bloc Caddy. La restriction
 * equivalente cote Caddy vit dans le depot LUCID.
 */

export const runtime = 'nodejs';

/** Un evenement Umami tient en moins de 2 Kio ; large marge pour les proprietes. */
const TAILLE_EVENEMENT_MAX = 16 * 1024;

function amont(): string {
  return (process.env.UMAMI_UPSTREAM || 'https://analytics.governance.brussels').replace(/\/+$/, '');
}

export async function POST(request: Request): Promise<Response> {
  const lu = await readTextCapped(request, TAILLE_EVENEMENT_MAX);
  if (!lu.ok) return new Response(null, { status: lu.status });

  const entetes = new Headers({ 'content-type': 'application/json' });
  const ua = request.headers.get('user-agent');
  if (ua) entetes.set('user-agent', ua);
  const cache = request.headers.get('x-umami-cache');
  if (cache) entetes.set('x-umami-cache', cache);
  const ip = clientIp(request.headers);
  if (ip !== 'unknown') entetes.set('x-forwarded-for', ip);

  let reponse: Response;
  try {
    reponse = await fetch(`${amont()}/api/send`, {
      method: 'POST',
      headers: entetes,
      body: lu.value,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return new Response(null, { status: 502 });
  }

  // Seul le corps revient au traceur (il y lit `cache` et `disabled`) : aucun
  // en-tete d'Umami, `Set-Cookie` compris, n'est recopie.
  return new Response(await reponse.text(), {
    status: reponse.status,
    headers: {
      'content-type': reponse.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store',
    },
  });
}
