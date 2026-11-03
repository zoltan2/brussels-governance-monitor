// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * GET : état du numéro (textes, essai, verrou, rapport, journal).
 * PUT : enregistre les textes d'un numéro ; périme l'essai.
 * Les textes vivent en SQLite sur le serveur, jamais dans le dépôt public.
 */
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { sameOriginRefusal } from '@/lib/same-origin';
import { getDb } from '@/lib/db';
import * as J from '@/lib/coulisses/journal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LONGUEUR_MAX = 20_000;

export const GET = auth(async function GET(req) {
  if (!req.auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Base non configurée' }, { status: 503 });
  const demande = Number(new URL(req.url).searchParams.get('numero'));
  const numero = Number.isInteger(demande) && demande > 0 ? demande : (J.dernierNumero(db) ?? 1);
  const n = J.lireNumero(db, numero);
  return NextResponse.json({
    numero,
    textes: n?.textes ?? null,
    etat: n?.etat ?? 'brouillon',
    essaiLe: n?.essaiLe ?? null,
    essaiAJour: Boolean(n && n.essaiEmpreinte && n.essaiEmpreinte === J.empreinteTextes(n.textes)),
    rapport: n?.rapport ?? null,
    journal: J.compterJournal(db, numero),
    exclusConfigures: process.env.COULISSES_EXCLUS !== undefined,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
});

export const PUT = auth(async function PUT(req) {
  if (!req.auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const refus = sameOriginRefusal(req.headers);
  if (refus) return NextResponse.json({ error: refus }, { status: 403 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Base non configurée' }, { status: 503 });

  let body: { numero?: unknown; textes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }
  const numero = Number(body.numero);
  if (!Number.isInteger(numero) || numero < 1) return NextResponse.json({ error: 'Numéro invalide' }, { status: 400 });

  const t = body.textes as Partial<J.Textes> | undefined;
  const textes = {} as J.Textes;
  for (const l of ['fr', 'nl', 'en'] as const) {
    const objet = t?.[l]?.objet;
    const corps = t?.[l]?.corps;
    if (typeof objet !== 'string' || typeof corps !== 'string' || objet.length > 300 || corps.length > LONGUEUR_MAX) {
      return NextResponse.json({ error: `Texte ${l} invalide` }, { status: 400 });
    }
    textes[l] = { objet: objet.trim(), corps };
  }
  if (J.enregistrerTextes(db, numero, textes) === 'verrouille') {
    return NextResponse.json({ error: 'Envoi commencé : texte figé' }, { status: 409 });
  }
  return NextResponse.json({ ok: true, complets: J.textesComplets(textes) });
});
