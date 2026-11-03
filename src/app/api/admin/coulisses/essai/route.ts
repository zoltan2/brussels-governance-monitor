// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/** POST : envoie chaque variante qui partira, dans les trois langues, à ADMIN_EMAIL seulement. */
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { sameOriginRefusal } from '@/lib/same-origin';
import { getDb } from '@/lib/db';
import { envoyerEssai } from '@/lib/coulisses/envoi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = auth(async function POST(req) {
  if (!req.auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const refus = sameOriginRefusal(req.headers);
  if (refus) return NextResponse.json({ error: refus }, { status: 403 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Base non configurée' }, { status: 503 });
  const admin = process.env.ADMIN_EMAIL;
  if (!admin || !process.env.RESEND_API_KEY) return NextResponse.json({ error: 'ADMIN_EMAIL ou RESEND_API_KEY absente' }, { status: 503 });

  let numero = NaN;
  try {
    numero = Number((await req.json()).numero);
  } catch {
    /* corps invalide */
  }
  if (!Number.isInteger(numero) || numero < 1) return NextResponse.json({ error: 'Numéro invalide' }, { status: 400 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';
  try {
    const r = await envoyerEssai(db, numero, admin, siteUrl);
    return NextResponse.json(r, { status: r.erreurs.length ? 502 : 200 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 400 });
  }
});
