// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { rateLimit } from '@/lib/rate-limit';

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  organization: z.string().max(200).optional().default(''),
  message: z.string().min(1).max(4000),
  source: z.string().max(80).optional().default('website'),
});

const CONTACT_RECIPIENT = 'contact@brusselsgovernance.be';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed } = rateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, organization, message, source } = parsed.data;

    if (!process.env.RESEND_API_KEY) {
      console.log('[Contact]', { name, organization, source, message });
      return NextResponse.json({ success: true });
    }

    const subjectTag = source === 'cafe-numerique' ? '[BGM Café Numérique]' : '[BGM Contact]';
    const subject = organization
      ? `${subjectTag} ${name} — ${organization}`
      : `${subjectTag} ${name}`;

    const resend = getResend();
    const { error: sendError } = await resendCall(() =>
      resend.emails.send({
        from: EMAIL_FROM,
        to: CONTACT_RECIPIENT,
        subject,
        text: [
          `Source: ${source}`,
          `Nom: ${name}`,
          `Organisation: ${organization || '—'}`,
          '',
          'Message:',
          message,
        ].join('\n'),
        tags: [
          { name: 'type', value: 'contact' },
          { name: 'source', value: source.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) },
        ],
      }),
    );

    if (sendError) {
      console.error('Resend contact error:', sendError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
