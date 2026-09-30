// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * POST /api/admin/sondage/export-entretiens : CSV des volontaires de Q9
 * (adresse e-mail et/ou téléphone, langue, jour, statut). Seule sortie du
 * sondage qui contient des coordonnées ; export distinct de celui des réponses,
 * sans rien qui les relie.
 */
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { sameOriginRefusal } from '@/lib/same-origin';
import { getDb } from '@/lib/db';
import { csvEntretiens } from '@/lib/sondage/admin';

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

  return new NextResponse(csvEntretiens(db), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sondage-entretiens.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
});
