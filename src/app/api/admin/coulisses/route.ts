// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * GET : état du rendez-vous d'un mois (`?mois=AAAA-MM`, par défaut le prochain) :
 *       édition, modèle de bienvenue, essai, verrou, rapport, journal, et
 *       l'historique de tous les envois (historique.ts).
 * PUT : enregistre la bienvenue (nouvelle version si elle change) et l'édition
 *       du mois ; tout changement périme l'essai.
 * Les textes vivent en SQLite sur le serveur, jamais dans le dépôt public.
 */
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { sameOriginRefusal } from '@/lib/same-origin';
import { getDb } from '@/lib/db';
import * as J from '@/lib/coulisses/journal';
import { etatAdmin, lireTextes } from '@/lib/coulisses/admin';
import { moisValide } from '@/lib/coulisses/calendrier';
import { lireHistorique } from '@/lib/coulisses/historique';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = auth(async function GET(req) {
  if (!req.auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Base non configurée' }, { status: 503 });
  const mois = new URL(req.url).searchParams.get('mois');
  return NextResponse.json(
    { ...etatAdmin(db, mois), historique: lireHistorique(db) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
});

export const PUT = auth(async function PUT(req) {
  if (!req.auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const refus = sameOriginRefusal(req.headers);
  if (refus) return NextResponse.json({ error: refus }, { status: 403 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Base non configurée' }, { status: 503 });

  let body: { mois?: unknown; edition?: unknown; bienvenue?: unknown; versionBienvenueBase?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }
  if (!moisValide(body.mois)) return NextResponse.json({ error: 'Mois invalide (AAAA-MM)' }, { status: 400 });
  if (!body.bienvenue || typeof body.bienvenue !== 'object' || !body.edition || typeof body.edition !== 'object') {
    return NextResponse.json({ error: 'Bienvenue et édition attendues' }, { status: 400 });
  }
  // Un onglet resté ouvert sur une ancienne version ne l'écrase pas en silence.
  const actuelle = J.lireBienvenue(db)?.version ?? null;
  const base = body.versionBienvenueBase ?? null;
  if (base !== actuelle) {
    return NextResponse.json(
      { error: `La bienvenue a changé ailleurs (version ${actuelle ?? 'aucune'}, page ouverte sur ${base ?? 'aucune'}) : recharger la page` },
      { status: 409 },
    );
  }
  const bienvenue = lireTextes(body.bienvenue, true);
  const edition = lireTextes(body.edition, false);
  if (!bienvenue || !edition) return NextResponse.json({ error: 'Texte invalide (longueur, ou retour à la ligne dans un objet ou un aperçu)' }, { status: 400 });

  const numero = J.numeroDuMois(db, body.mois, true);
  if (numero === null) return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 500 });
  // L'édition d'abord : si le rendez-vous est figé, rien n'est enregistré.
  if (J.enregistrerTextes(db, numero, edition) === 'verrouille') {
    return NextResponse.json({ error: 'Envoi commencé : édition figée' }, { status: 409 });
  }
  const version = J.enregistrerBienvenue(db, bienvenue);
  return NextResponse.json({
    ok: true,
    versionBienvenue: version,
    bienvenueComplete: J.textesComplets(bienvenue),
    editionValide: J.editionValide(edition),
  });
});
