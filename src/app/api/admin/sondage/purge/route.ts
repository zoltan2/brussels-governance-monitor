// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * POST /api/admin/sondage/purge : lance la purge du sondage lecteurs
 * (src/lib/sondage/purge.ts). Aucun cron ne l'appelle : c'est un geste de
 * l'administrateur, confirmé en tapant PURGER dans le formulaire de l'admin.
 * Redirige (303) vers l'admin avec le bilan en paramètres.
 */
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { sameOriginRefusal } from '@/lib/same-origin';
import { getDb } from '@/lib/db';
import { CONFIRMATION_PURGE, purgerSondage } from '@/lib/sondage/purge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = auth(async function POST(req) {
  if (!req.auth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const refusOrigine = sameOriginRefusal(req.headers);
  if (refusOrigine) {
    return NextResponse.json({ error: refusOrigine }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (form?.get('confirmation') !== CONFIRMATION_PURGE) {
    return NextResponse.json({ error: `Confirmation absente : tapez ${CONFIRMATION_PURGE}` }, { status: 400 });
  }
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Base non configurée' }, { status: 503 });

  const bilan = purgerSondage(db, new Date());
  // L'adresse publique du site, pas `req.url` : derrière Caddy, celle-ci
  // désigne le conteneur.
  const cible = new URL('/fr/admin/sondage', process.env.NEXT_PUBLIC_SITE_URL || req.url);
  cible.searchParams.set('entretiens', String(bilan.entretiensSupprimes));
  cible.searchParams.set('reponses', String(bilan.reponsesSupprimees));
  return NextResponse.redirect(cible, 303);
});
