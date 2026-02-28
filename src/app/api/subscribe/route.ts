// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResend, EMAIL_FROM, getContact, updateContactPreferences, resendCall } from '@/lib/resend';
import { generateConfirmToken } from '@/lib/token';
import { rateLimit } from '@/lib/rate-limit';
import ConfirmEmail from '@/emails/confirm';

const subscribeSchema = z.object({
  email: z.string().email(),
  locale: z.enum(['fr', 'nl', 'en', 'de']),
  topics: z.array(z.string().min(1)).min(1),
  website: z.string().max(0).optional(), // honeypot field — must be empty
});

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed, remaining } = rateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(remaining) },
        },
      );
    }

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    // Honeypot check — if the hidden field has a value, it's a bot
    if (parsed.success && parsed.data.website) {
      // Silently accept to not reveal the honeypot
      return NextResponse.json({ success: true, requiresConfirmation: true });
    }

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { email, locale, topics } = parsed.data;

    if (!process.env.RESEND_API_KEY) {
      console.error('Subscribe: RESEND_API_KEY is not set');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 },
      );
    }

    // Check if email is already a confirmed subscriber
    const existing = await getContact(email);
    if (existing) {
      // Merge new topics with existing ones (deduplicated)
      const mergedTopics = [...new Set([...existing.topics, ...topics])];
      await updateContactPreferences(email, locale, mergedTopics);
      return NextResponse.json({
        success: true,
        alreadySubscribed: true,
        topics: mergedTopics,
      });
    }

    // New subscriber — send confirmation email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const token = generateConfirmToken({ email, locale, topics });
    const confirmUrl = `${siteUrl}/${locale}/subscribe/confirm?token=${encodeURIComponent(token)}`;

    const resend = getResend();
    const { error: sendError } = await resendCall(() =>
      resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: {
          fr: 'Confirmez votre inscription — Brussels Governance Monitor',
          nl: 'Bevestig uw inschrijving — Brussels Governance Monitor',
          en: 'Confirm your subscription — Brussels Governance Monitor',
          de: 'Bestätigen Sie Ihre Anmeldung — Brussels Governance Monitor',
        }[locale] || 'Confirmez votre inscription — Brussels Governance Monitor',
        react: ConfirmEmail({ locale, confirmUrl }),
        tags: [
          { name: 'type', value: 'confirm' },
          { name: 'locale', value: locale },
        ],
      }),
    );

    if (sendError) {
      console.error('Resend error:', sendError);
      return NextResponse.json(
        { error: 'Failed to send confirmation email' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, requiresConfirmation: true });
  } catch (err) {
    console.error('Subscribe: unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
