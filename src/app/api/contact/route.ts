// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/client-ip';

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  organization: z.string().max(200).optional().default(''),
  message: z.string().min(1).max(4000),
  source: z.string().max(80).optional().default('website'),
});

const CONTACT_RECIPIENT = 'contact@brusselsgovernance.be';

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers);
    const { allowed } = rateLimit(ip, { bucket: 'contact' });
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

    const { name, email, organization, message, source } = parsed.data;

    if (!process.env.RESEND_API_KEY) {
      // En developpement, la configuration manque legitimement : on accepte en
      // journalisant, sans donnees personnelles.
      //
      // En PRODUCTION, cette branche etait un repli qui ment. Si la cle Resend
      // expirait ou etait revoquee, le site continuait de repondre « message
      // envoye », aucun mail ne partait, personne ne s'en apercevait, et chaque
      // soumission empilait nom, adresse et message EN CLAIR dans le journal du
      // conteneur. Perte de donnees et fuite de donnees simultanees. Une alarme
      // qui se tait n'est pas une alarme (audit 21/09).
      console.log('[Contact] Resend non configure', {
        source,
        hasEmail: Boolean(email),
        hasOrganization: Boolean(organization),
        longueurMessage: message.length,
      });
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
      }
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
        replyTo: email,
        subject,
        text: [
          `Source: ${source}`,
          `Nom: ${name}`,
          `Email: ${email}`,
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
