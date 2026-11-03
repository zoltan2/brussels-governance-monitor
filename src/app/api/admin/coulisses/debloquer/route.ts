// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/** POST : débloque un envoi resté « en cours » plus de 10 minutes (conteneur redémarré). */
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { sameOriginRefusal } from '@/lib/same-origin';
import { getDb } from '@/lib/db';
import { debloquer, BLOCAGE_MINUTES } from '@/lib/coulisses/journal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = auth(async function POST(req) {
  if (!req.auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const refus = sameOriginRefusal(req.headers);
  if (refus) return NextResponse.json({ error: refus }, { status: 403 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Base non configurée' }, { status: 503 });
  let numero = NaN;
  try {
    numero = Number((await req.json()).numero);
  } catch {
    /* corps invalide */
  }
  if (!Number.isInteger(numero) || numero < 1) return NextResponse.json({ error: 'Numéro invalide' }, { status: 400 });
  if (!debloquer(db, numero)) {
    return NextResponse.json({ error: `Rien à débloquer (envoi absent ou lancé il y a moins de ${BLOCAGE_MINUTES} minutes)` }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
});
