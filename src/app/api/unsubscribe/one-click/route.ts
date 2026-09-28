// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/token';
import { removeContact } from '@/lib/resend';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/client-ip';
import { readTextCapped } from '@/lib/request-guards';
import { routing } from '@/i18n/routing';

/**
 * Cible de l'en-tête `List-Unsubscribe` des emails (RFC 8058).
 *
 * Le client de messagerie envoie un POST dont le corps vaut exactement
 * `List-Unsubscribe=One-Click` ; le jeton est dans l'URL. Aucun email ne part
 * d'ici : ni confirmation au lecteur (la RFC demande une action silencieuse),
 * ni notification à l'administrateur (sinon la route redevient un
 * amplificateur d'envois, cf. l'audit du 21/09 sur /api/unsubscribe).
 *
 * La limite est large et par IP : les POST de Gmail partent d'un parc
 * d'adresses partagé, une limite à 5 bloquerait des désabonnements légitimes.
 */
const CORPS_RFC_8058 = 'List-Unsubscribe=One-Click';

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const { allowed } = rateLimit(ip, { max: 60, bucket: 'unsubscribe-one-click' });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Lecture plafonnee, `Content-Length` ou pas (envoi en `chunked`).
  const lu = await readTextCapped(request);
  if (!lu.ok && lu.status === 413) {
    return NextResponse.json({ error: lu.error }, { status: 413 });
  }
  const corps = (lu.ok ? lu.value : '').trim();
  if (corps !== CORPS_RFC_8058) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const token = new URL(request.url).searchParams.get('token');
  const payload = token ? verifyUnsubscribeToken(token) : null;
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }

  try {
    await removeContact(payload.email);
  } catch (error) {
    console.error('[unsubscribe-one-click] échec Resend', error);
    return NextResponse.json({ error: 'Unsubscribe failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * Un GET ne désabonne jamais : les scanners de liens des messageries
 * suivent les URL d'en-tête. On renvoie vers la page de préférences.
 */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const demande = searchParams.get('locale');
  const locale = (routing.locales as readonly string[]).includes(demande ?? '')
    ? demande
    : routing.defaultLocale;
  const token = searchParams.get('token') ?? '';
  return NextResponse.redirect(
    `${siteUrl}/${locale}/subscribe/preferences?token=${encodeURIComponent(token)}`,
  );
}
