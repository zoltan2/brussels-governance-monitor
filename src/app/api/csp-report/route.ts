// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { clientIp } from '@/lib/client-ip';
import { rateLimit } from '@/lib/rate-limit';
import { readTextCapped } from '@/lib/request-guards';
import { resumerRapportsCsp } from '@/lib/csp-report';

/**
 * Point de collecte des violations de la CSP (`report-uri` et `report-to`,
 * declares dans `next.config.ts`).
 *
 * Avant le 28/09/2026 la CSP n'avait aucun rapport : une violation, donc une
 * fonction du site cassee par la politique ou une injection bloquee, ne
 * remontait nulle part (revue red team, « CSP muette »).
 *
 * La route JOURNALISE, elle ne stocke rien : une ligne `[csp-violation]` par
 * rapport dans la sortie du conteneur. Ni adresse IP, ni User-Agent, ni chaine
 * de requete (qui peut porter un jeton d'abonne) : voir `src/lib/csp-report.ts`.
 *
 * Trois plafonds, parce que n'importe qui peut ecrire ici :
 *  - 8 Kio par corps (un rapport pese quelques centaines d'octets) ;
 *  - 20 envois par minute et par adresse, 300 par minute en tout (un flot
 *    venu de nombreuses adresses ne noie pas les journaux) ;
 *  - 5 rapports journalises par envoi (le format `report-to` les groupe).
 * La reponse est toujours vide : l'appelant n'apprend rien.
 */

export const runtime = 'nodejs';

const TAILLE_MAX = 8 * 1024;

export async function POST(request: Request): Promise<Response> {
  const { allowed } = rateLimit(clientIp(request.headers), { max: 20, bucket: 'csp-report' });
  if (!allowed) return new Response(null, { status: 429 });
  const { allowed: sousPlafondGlobal } = rateLimit('tous', { max: 300, bucket: 'csp-report-global' });
  if (!sousPlafondGlobal) return new Response(null, { status: 429 });

  const lu = await readTextCapped(request, TAILLE_MAX);
  if (!lu.ok) return new Response(null, { status: lu.status });

  for (const ligne of resumerRapportsCsp(lu.value)) {
    console.warn(`[csp-violation] ${JSON.stringify(ligne)}`);
  }
  return new Response(null, { status: 204 });
}
