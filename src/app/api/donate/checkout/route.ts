// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { rateLimit } from '@/lib/rate-limit';
import { routing } from '@/i18n/routing';

export const runtime = 'nodejs';

const PRICE_IDS: Record<string, string | undefined> = {
  '500': process.env.STRIPE_PRICE_ID_DONATE_5,
  '1000': process.env.STRIPE_PRICE_ID_DONATE_10,
  '2500': process.env.STRIPE_PRICE_ID_DONATE_25,
};

export async function POST(request: Request) {
  // Cap checkout-session creation per IP. Mirrors /api/chat/checkout.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = rateLimit(ip, { max: 5, bucket: 'donate-checkout' });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const cents = String(body?.cents ?? '');
  const priceId = PRICE_IDS[cents];
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const locale = routing.locales.includes(body?.locale)
    ? body.locale
    : routing.defaultLocale;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const stripe = new Stripe(secret);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/${locale}/support?donated=1`,
      cancel_url: `${siteUrl}/${locale}/support`,
      locale: locale as Stripe.Checkout.SessionCreateParams['locale'],
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe donate checkout error:', err);
    return NextResponse.json(
      { error: 'Checkout session creation failed' },
      { status: 500 },
    );
  }
}
