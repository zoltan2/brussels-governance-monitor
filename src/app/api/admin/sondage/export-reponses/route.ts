// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * POST /api/admin/sondage/export-reponses : CSV des réponses terminées du
 * sondage lecteurs, sans aucune adresse ni identifiant de session.
 *
 * POST plutôt que GET : un lien GET n'envoie pas d'en-tête Origin, et la garde
 * d'origine (garde-origine.test.ts) le refuserait. Le bouton de l'admin est un
 * formulaire.
 */
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { sameOriginRefusal } from '@/lib/same-origin';
import { getDb } from '@/lib/db';
import { csvReponses } from '@/lib/sondage/admin';

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
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Base non configurée' }, { status: 503 });

  return new NextResponse(csvReponses(db), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sondage-reponses.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
});
