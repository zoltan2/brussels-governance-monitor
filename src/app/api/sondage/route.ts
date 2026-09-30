// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * POST /api/sondage : enregistre un écran du sondage lecteurs (anonyme).
 *
 * La route lit la requête (IP, cookie, corps plafonné) et applique le résultat
 * de `traiterEnvoi` (src/lib/sondage/traitement.ts), où vivent toutes les
 * décisions : période, limites, champ piège, validation, verrou, 20 s.
 * Réponses `Cache-Control: private, no-store` : rien de ceci ne se met en cache.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { clientIp } from '@/lib/client-ip';
import { readJsonCapped } from '@/lib/request-guards';
import { campagneDepuisEnv, etatCampagne, piloteParEnv } from '@/lib/sondage/campagne';
import { COOKIE_SONDAGE, optionsCookieSondage } from '@/lib/sondage/cookie';
import { traiterEnvoi } from '@/lib/sondage/traitement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAS_DE_CACHE = { 'Cache-Control': 'private, no-store' };

/** Un questionnaire tient en quelques Ko ; 16 Kio laissent une marge large. */
const CORPS_MAX = 16 * 1024;

export async function POST(request: Request) {
  const maintenant = new Date();
  const campagne = campagneDepuisEnv();

  // Hors période : refus avant même de lire le corps.
  const etat = etatCampagne(maintenant, campagne);
  if (etat !== 'ouverte') {
    return NextResponse.json(
      { ok: false, erreur: etat === 'close' ? 'sondage_clos' : 'sondage_pas_ouvert' },
      { status: 410, headers: PAS_DE_CACHE },
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ ok: false, erreur: 'indisponible' }, { status: 503, headers: PAS_DE_CACHE });
  }

  const lu = await readJsonCapped(request, CORPS_MAX);
  if (!lu.ok) {
    return NextResponse.json({ ok: false, erreur: 'invalide' }, { status: lu.status, headers: PAS_DE_CACHE });
  }

  const magasin = await cookies();
  const resultat = traiterEnvoi(
    { corps: lu.value, session: magasin.get(COOKIE_SONDAGE)?.value, ip: clientIp(request.headers) },
    { db, maintenant, campagne, piloteEnv: piloteParEnv() },
  );

  const reponse = NextResponse.json(resultat.corps, { status: resultat.status, headers: PAS_DE_CACHE });
  if (resultat.session) {
    reponse.cookies.set(COOKIE_SONDAGE, resultat.session, optionsCookieSondage());
  }
  return reponse;
}
