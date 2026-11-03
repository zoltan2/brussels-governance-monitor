// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * POST : envoi réel d'un numéro. Exige de retaper le numéro, un essai fait
 * sur le texte actuel, et prend le verrou du numéro (second clic refusé).
 *
 * L'envoi tourne APRÈS la réponse (`after`, pris en charge en auto-hébergement
 * et terminé avant l'arrêt du serveur) : la lecture d'environ 130 fiches Resend
 * approche le délai de 100 s de Cloudflare. L'admin suit l'état en relisant
 * GET /api/admin/coulisses.
 */
import { auth } from '@/auth';
import { NextResponse, after } from 'next/server';
import { sameOriginRefusal } from '@/lib/same-origin';
import { getDb } from '@/lib/db';
import { prendreVerrou } from '@/lib/coulisses/journal';
import { contenuDuRendezVous, contenuIncomplet, envoyerNumero } from '@/lib/coulisses/envoi';
import { estJourDEnvoi, jourEnClair, premierJeudi } from '@/lib/coulisses/calendrier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = auth(async function POST(req) {
  if (!req.auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const refus = sameOriginRefusal(req.headers);
  if (refus) return NextResponse.json({ error: refus }, { status: 403 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Base non configurée' }, { status: 503 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY absente' }, { status: 503 });

  let body: { numero?: unknown; confirmation?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* corps invalide */
  }
  const numero = Number(body.numero);
  if (!Number.isInteger(numero) || numero < 1) return NextResponse.json({ error: 'Numéro invalide' }, { status: 400 });
  const c = contenuDuRendezVous(db, numero);
  if (!c || !c.numero.mois) return NextResponse.json({ error: 'Rendez-vous inconnu' }, { status: 404 });
  if (String(body.confirmation ?? '').trim() !== c.numero.mois) {
    return NextResponse.json({ error: `Retaper le mois (${c.numero.mois}) pour confirmer` }, { status: 400 });
  }
  // Le premier jeudi du mois, à Bruxelles, et ce jour-là seulement : jamais de rattrapage.
  if (!estJourDEnvoi(c.numero.mois, new Date())) {
    return NextResponse.json(
      { error: `Envoi possible seulement le ${jourEnClair(premierJeudi(c.numero.mois))} (heure de Bruxelles)` },
      { status: 409 },
    );
  }
  const raison = contenuIncomplet(c);
  if (raison) return NextResponse.json({ error: raison }, { status: 409 });
  if (!prendreVerrou(db, numero, c.empreinte)) {
    return NextResponse.json(
      { error: 'Envoi refusé : déjà en cours ou fait, ou essai absent ou périmé' },
      { status: 409 },
    );
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';
  after(async () => {
    try {
      await envoyerNumero(db, numero, siteUrl);
    } catch (e) {
      console.error('[coulisses-envoi] arrêt inattendu', e instanceof Error ? e.message : e);
    }
  });
  return NextResponse.json({ lance: true, numero }, { status: 202 });
});
