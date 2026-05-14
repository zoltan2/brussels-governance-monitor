// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { rateLimit } from '@/lib/rate-limit';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const intelSchema = z.object({
  url: z.string().url(),
  title: z.string().max(500).default('(sans titre)'),
  selectedText: z.string().max(5000).optional(),
  note: z.string().max(1000).optional(),
  contributor: z.string().max(100).default('Anonyme'),
});

const INTEL_RECIPIENT = process.env.ADMIN_EMAIL ?? 'feedback@brusselsgovernance.be';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token || token !== process.env.INBOX_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const { allowed } = rateLimit(ip, { bucket: 'intel-inbox' });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: CORS_HEADERS });
    }

    const body = await request.json();
    const parsed = intelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const { url, title, selectedText, note, contributor } = parsed.data;

    const timestamp = new Intl.DateTimeFormat('fr-BE', {
      timeZone: 'Europe/Brussels',
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date());

    const bodyLines = [
      `URL : ${url}`,
      `Contributeur : ${contributor}`,
      `Reçu le : ${timestamp}`,
    ];
    if (note) bodyLines.push('', 'Note :', note);
    if (selectedText) bodyLines.push('', 'Texte sélectionné :', selectedText);

    if (!process.env.RESEND_API_KEY) {
      console.log('[intel-inbox]', { url, title, contributor, note, selectedText });
      return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
    }

    const resend = getResend();
    const { error: sendError } = await resendCall(() =>
      resend.emails.send({
        from: EMAIL_FROM,
        to: INTEL_RECIPIENT,
        subject: `[Intel] ${title} — ${contributor}`,
        text: bodyLines.join('\n'),
        tags: [{ name: 'type', value: 'intel-inbox' }],
      }),
    );

    if (sendError) {
      console.error('[intel-inbox] Resend error:', sendError);
      return NextResponse.json({ error: 'Failed to send' }, { status: 500, headers: CORS_HEADERS });
    }

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS_HEADERS });
  }
}
