// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/client-ip';

const feedbackSchema = z.object({
  cardTitle: z.string().min(1).max(200),
  cardType: z.string().min(1).max(50),
  cardSlug: z.string().min(1).max(100),
  feedbackType: z.enum(['error', 'correction', 'source', 'other', 'suggest-dossier', 'suggest-source']),
  message: z.string().min(1).max(2000),
  email: z.string().email().optional(),
  url: z.string().url().max(500),
  context: z.string().max(2000).optional(),
});

const FEEDBACK_RECIPIENT = 'feedback@brusselsgovernance.be';

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers);
    const { allowed } = rateLimit(ip, { bucket: 'feedback' });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { cardTitle, cardType, cardSlug, feedbackType, message, email, url, context } = parsed.data;

    if (!process.env.RESEND_API_KEY) {
      // Voir src/app/api/contact/route.ts : accepter en developpement, refuser
      // franchement en production plutot que d'accuser reception d'un message
      // que personne ne recevra, et ne jamais deverser son contenu en clair.
      console.log('[Feedback] Resend non configure', {
        cardType,
        cardSlug,
        feedbackType,
        hasEmail: Boolean(email),
        longueurMessage: message.length,
      });
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
      }
      return NextResponse.json({ success: true });
    }

    const resend = getResend();
    const { error: sendError } = await resendCall(() =>
      resend.emails.send({
        from: EMAIL_FROM,
        to: FEEDBACK_RECIPIENT,
        subject: `[BGM Feedback] ${feedbackType} — ${cardTitle}`,
        text: [
          `Type: ${feedbackType}`,
          `Card: ${cardTitle} (${cardType}/${cardSlug})`,
          `URL: ${url}`,
          email ? `Reply to: ${email}` : 'No reply email provided',
          ...(context ? ['', 'Context:', context] : []),
          '',
          'Message:',
          message,
        ].join('\n'),
        replyTo: email || undefined,
        tags: [
          { name: 'type', value: 'feedback' },
          { name: 'feedbackType', value: feedbackType },
          { name: 'cardType', value: cardType },
        ],
      }),
    );

    if (sendError) {
      console.error('Resend feedback error:', sendError);
      return NextResponse.json({ error: 'Failed to send feedback' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
