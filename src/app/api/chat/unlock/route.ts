// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/client-ip';
import { CHAT_ACCESS_COOKIE, mintChatAccess } from '@/lib/chat-access';

export const runtime = 'nodejs';

/**
 * Retour de paiement du chatbot.
 *
 * Stripe renvoie ici avec l'identifiant de la session de paiement. Cette route
 * INTERROGE Stripe pour savoir si la session a reellement ete payee, puis pose
 * un cookie d'acces signe cote serveur.
 *
 * Ce qu'elle remplace : `success_url` pointait vers `/fr?chat_unlocked=1`, et le
 * widget accordait 90 jours d'acces a la seule vue de ce parametre. Aucun
 * webhook n'existait, donc aucune session n'etait jamais verifiee.
 *
 * Pourquoi une verification a la volee plutot qu'un webhook : le webhook est un
 * appel de serveur a serveur, il ne peut pas poser de cookie dans le navigateur
 * de la personne qui vient de payer. Il faudrait de toute facon cette route pour
 * echanger la preuve contre un cookie. Interroger Stripe ici suffit et supprime
 * un composant, donc une surface.
 */
export async function GET(request: Request) {
  const ip = clientIp(request.headers);
  const { allowed } = rateLimit(ip, { max: 10, bucket: 'chat-unlock' });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const echec = NextResponse.redirect(`${siteUrl}/fr?chat_unlocked=0`, { status: 303 });

  const sessionId = new URL(request.url).searchParams.get('session_id');
  // Les identifiants de session Stripe sont opaques : on borne la forme avant de
  // la transmettre, plutot que de relayer telle quelle une valeur d'URL.
  if (!sessionId || !/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) return echec;

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return echec;

  try {
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Seul `paid` ouvre l'acces. `unpaid` et `no_payment_required` ne valent rien
    // ici : la lecture echoue fermee.
    if (session.payment_status !== 'paid') return echec;

    const { value, maxAge } = mintChatAccess(sessionId);
    const ok = NextResponse.redirect(`${siteUrl}/fr?chat_unlocked=1`, { status: 303 });
    ok.cookies.set(CHAT_ACCESS_COOKIE, value, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
    return ok;
  } catch (err) {
    console.error('[chat/unlock] verification de session impossible', err);
    return echec;
  }
}
