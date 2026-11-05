// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Qui recevrait quoi si l'on envoyait maintenant (bienvenues et éditions par
 * langue, exclusions par motif). Lit la liste Resend, n'écrit rien, ne renvoie
 * aucune adresse.
 *
 * La lecture prend environ 0,6 s par contact (rythme imposé par resendCall) :
 * au-delà de quelques dizaines d'abonnés, elle dépasserait le délai de 100 s de
 * Cloudflare. POST la lance donc en arrière-plan (comme l'envoi réel), GET lit
 * le dernier résultat. Gardé en mémoire du processus : un redémarrage l'efface,
 * il suffit de relancer.
 */
import { auth } from '@/auth';
import { NextResponse, after } from 'next/server';
import { sameOriginRefusal } from '@/lib/same-origin';
import { getDb } from '@/lib/db';
import { simuler, masquerAdresses, type Simulation } from '@/lib/coulisses/envoi';
import { lireNumero as lireRendezVous } from '@/lib/coulisses/journal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Etat = { lanceLe: number; finLe?: number; resultat?: Simulation; erreur?: string };
const simulations = new Map<number, Etat>();

function lireNumero(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const GET = auth(async function GET(req) {
  if (!req.auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const numero = lireNumero(new URL(req.url).searchParams.get('numero'));
  if (numero === null) return NextResponse.json({ error: 'Numéro invalide' }, { status: 400 });
  return NextResponse.json(simulations.get(numero) ?? null, { headers: { 'Cache-Control': 'private, no-store' } });
});

export const POST = auth(async function POST(req) {
  if (!req.auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const refus = sameOriginRefusal(req.headers);
  if (refus) return NextResponse.json({ error: refus }, { status: 403 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Base non configurée' }, { status: 503 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY absente' }, { status: 503 });

  let numero: number | null = null;
  try {
    numero = lireNumero((await req.json()).numero);
  } catch {
    /* corps invalide */
  }
  if (numero === null) return NextResponse.json({ error: 'Numéro invalide' }, { status: 400 });
  // Pendant un envoi, deux lectures de Resend au même rythme risqueraient des 429.
  if (lireRendezVous(db, numero)?.etat === 'envoi') {
    return NextResponse.json({ error: 'Envoi en cours : simulation refusée' }, { status: 409 });
  }
  const enCours = simulations.get(numero);
  // Une seule lecture à la fois par rendez-vous (double clic, second onglet).
  if (enCours && !enCours.finLe && Date.now() - enCours.lanceLe < 10 * 60_000) {
    return NextResponse.json({ lance: false, enCours: true }, { status: 202 });
  }
  const etat: Etat = { lanceLe: Date.now() };
  simulations.set(numero, etat);
  const n = numero;
  after(async () => {
    try {
      etat.resultat = await simuler(db, n);
    } catch (e) {
      etat.erreur = masquerAdresses(e instanceof Error ? e.message : String(e));
    } finally {
      etat.finLe = Date.now();
    }
  });
  return NextResponse.json({ lance: true }, { status: 202 });
});
