// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * ROUTE RETIREE le 21/09/2026. Elle ne fait plus rien et ne doit pas revenir.
 *
 * Ce qu'elle faisait : sur presentation d'un jeton, et SANS session, sans garde
 * d'origine et sans limitation de debit, elle lisait la liste complete des
 * abonnes, leur expediait le digest par lots, puis ecrivait dans le depot Git.
 * C'etait le seul `route.ts` a privileges du depot qui n'importait pas `@/auth`.
 *
 * Trois defauts se cumulaient :
 *
 *  1. Le jeton etait accepte depuis la CHAINE DE REQUETE autant que depuis le
 *     corps, et `cron/prepare-digest` le placait dans l'URL d'un email. Une URL
 *     traverse les journaux Caddy, les journaux Cloudflare, l'historique du
 *     navigateur et l'en-tete `Referer` des sous-requetes same-origin : le
 *     secret etait recopie dans trois systemes de journalisation.
 *  2. Le jeton ne liait que la semaine et n'etait pas consomme a l'usage : il
 *     restait rejouable 24 h durant.
 *  3. Elle etait ORPHELINE. La page de relecture n'a jamais lu `approve_token`,
 *     et le client appelle `/api/digest/approve-from-review`, qui fait la meme
 *     chose derriere une session et une garde d'origine. Le chemin sur ne l'a
 *     jamais remplacee : il a toujours ete le seul utilise.
 *
 * Le fichier est conserve, vide de toute capacite, plutot que supprime : il
 * documente la decision et evite qu'une route du meme nom soit recreee sans
 * connaitre cette histoire. Le dossier peut etre supprime sur decision explicite.
 */
const PARTI = {
  error: 'Gone',
  detail:
    "Route retiree. L'approbation du digest passe par /api/digest/approve-from-review, " +
    'authentifiee par session.',
};

export async function POST() {
  return NextResponse.json(PARTI, { status: 410 });
}

export async function GET() {
  return NextResponse.json(PARTI, { status: 410 });
}
