// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/token';
import { setMotMensuel } from '@/lib/resend';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/client-ip';
import { readTextCapped } from '@/lib/request-guards';
import { corpsOneClickValide } from '@/lib/one-click-corps';
import { routing } from '@/i18n/routing';

/**
 * Cible de l'en-tête `List-Unsubscribe` des mails « Les coulisses de BGM »
 * (RFC 8058). Refuse les coulisses SEULES : écrit `mot_mensuel = non`, ne
 * touche ni au digest, ni aux thèmes, ni à la langue. Calquée sur
 * /api/unsubscribe/one-click, qui retire le contact entier.
 */

export async function POST(request: Request) {
  const { allowed } = rateLimit(clientIp(request.headers), { max: 60, bucket: 'coulisses-one-click' });
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const lu = await readTextCapped(request);
  if (!lu.ok && lu.status === 413) return NextResponse.json({ error: lu.error }, { status: 413 });
  if (!(await corpsOneClickValide(lu.ok ? lu.value : '', request.headers.get('content-type')))) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const token = new URL(request.url).searchParams.get('token');
  const payload = token ? verifyUnsubscribeToken(token) : null;
  if (!payload) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });

  try {
    await setMotMensuel(payload.email, false);
  } catch (error) {
    console.error('[coulisses-one-click] échec Resend', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

/** Un GET ne refuse jamais rien (scanners de liens) : page de préférences, sur la case. */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const demande = searchParams.get('locale');
  const locale = (routing.locales as readonly string[]).includes(demande ?? '') ? demande : routing.defaultLocale;
  const token = searchParams.get('token') ?? '';
  return NextResponse.redirect(
    `${siteUrl}/${locale}/subscribe/preferences?token=${encodeURIComponent(token)}#coulisses`,
  );
}
