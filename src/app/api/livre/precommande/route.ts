// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { rateLimit } from '@/lib/rate-limit';

const preorderSchema = z.object({
  firstName: z.string().min(1).max(100),
  email: z.string().email(),
});

function buildConfirmationEmail(firstName: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#F7F8FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F8FC;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:8px;border:1px solid #e5e7eb;">

<!-- Header -->
<tr><td style="padding:32px 32px 0;text-align:center;">
<p style="margin:0;font-size:14px;font-weight:600;color:#1B3A6B;letter-spacing:0.05em;">BRUSSELS GOVERNANCE MONITOR</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:24px 32px 32px;">
<p style="margin:0 0 16px;font-size:16px;color:#1B3A6B;font-weight:600;">Bonjour ${firstName},</p>

<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
Ta pr&eacute;commande de <strong>&laquo;&nbsp;La Lasagne&nbsp;&raquo;</strong> est bien enregistr&eacute;e.
</p>

<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
Tu seras parmi les premiers inform&eacute;s de la date de parution et du prix d&eacute;finitif. Merci de ta confiance.
</p>

<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1B3A6B;">En attendant&nbsp;:</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
<tr><td style="padding:4px 0;font-size:14px;line-height:1.5;color:#374151;">
&rarr; <a href="https://governance.brussels" style="color:#1B3A6B;text-decoration:underline;">governance.brussels</a> &mdash; la plateforme de veille citoyenne
</td></tr>
<tr><td style="padding:4px 0;font-size:14px;line-height:1.5;color:#374151;">
&rarr; <a href="https://www.linkedin.com/newsletters/le-signal-bgm-7430513857359527936/" style="color:#1B3A6B;text-decoration:underline;">Le Signal</a> &mdash; la newsletter hebdomadaire BGM sur LinkedIn
</td></tr>
<tr><td style="padding:4px 0;font-size:14px;line-height:1.5;color:#374151;">
&rarr; <a href="https://podcast.governance.brussels" style="color:#1B3A6B;text-decoration:underline;">Le Briefing BGM</a> &mdash; le podcast
</td></tr>
</table>

<p style="margin:0 0 4px;font-size:14px;color:#374151;">&Agrave; bient&ocirc;t,</p>
<p style="margin:0 0 0;font-size:14px;font-weight:600;color:#1B3A6B;">Zolt&aacute;n J&aacute;nosi</p>
<p style="margin:0;font-size:13px;color:#6b7280;">Fondateur, Brussels Governance Monitor</p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
<p style="margin:0;font-size:12px;color:#9ca3af;">
governance.brussels &middot; Anderlecht, Bruxelles
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed, remaining } = rateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de requetes. Reessayez dans une minute.' },
        {
          status: 429,
          headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(remaining) },
        },
      );
    }

    const body = await request.json();
    const parsed = preorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Prenom et email valide requis.' },
        { status: 400 },
      );
    }

    const { firstName, email } = parsed.data;

    if (!process.env.RESEND_API_KEY) {
      console.error('Livre preorder: RESEND_API_KEY is not set');
      return NextResponse.json(
        { error: 'Service email non configure.' },
        { status: 503 },
      );
    }

    const resend = getResend();

    // Add contact with preorder tag
    // TODO: add RESEND_AUDIENCE_ID to .env.local if a separate audience is desired
    await resendCall(() =>
      resend.contacts.create({
        email,
        firstName,
        unsubscribed: false,
        properties: {
          source: 'livre-precommande',
          preorderDate: new Date().toISOString().slice(0, 10),
        },
      }),
    );

    // Send confirmation email
    const { error: sendError } = await resendCall(() =>
      resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: 'Ta precommande de "La Lasagne" est confirmee',
        html: buildConfirmationEmail(firstName),
        tags: [
          { name: 'type', value: 'livre-precommande' },
        ],
      }),
    );

    if (sendError) {
      console.error('Livre preorder: Resend error:', sendError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'envoi de l\'email de confirmation.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Livre preorder: unexpected error:', err);
    return NextResponse.json(
      { error: 'Erreur interne. Veuillez reessayer.' },
      { status: 500 },
    );
  }
}
