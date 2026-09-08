// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/client-ip';
import { recordPreorder } from '@/lib/preorder-log';
import { escapeHtml } from '@/lib/html-escape';

const preorderSchema = z.object({
  firstName: z.string().min(1).max(100),
  email: z.string().email(),
});

function buildConfirmationEmail(firstName: string): string {
  const safeName = escapeHtml(firstName);
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="only light">
<meta name="supported-color-schemes" content="light">
<meta name="x-apple-disable-message-reformatting"></head>
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
<p style="margin:0 0 16px;font-size:16px;color:#1B3A6B;font-weight:600;">Bonjour ${safeName},</p>

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
&rarr; <a href="https://podcast.governance.brussels/@lebriefingbgm/episodes" style="color:#1B3A6B;text-decoration:underline;">Le Briefing BGM</a> &mdash; le podcast
</td></tr>
</table>

<p style="margin:0 0 4px;font-size:14px;color:#374151;">&Agrave; bient&ocirc;t,</p>
<p style="margin:0 0 0;font-size:14px;font-weight:600;color:#1B3A6B;">Zolt&aacute;n J&aacute;nosi</p>
<p style="margin:0;font-size:13px;color:#6b7280;">Fondateur, Brussels Governance Monitor</p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#6b7280;">
Je construis des outils pour rendre la gouvernance bruxelloise lisible. Si tu travailles sur quelque chose qui touche &agrave; la transparence, &agrave; l&rsquo;intelligence territoriale, ou &agrave; la communication institutionnelle &mdash; je suis preneur d&rsquo;un &eacute;change.
</p>
<p style="margin:0 0 12px;font-size:13px;color:#6b7280;">
Tu peux aussi soutenir BGM directement&nbsp;:<br>
<a href="https://governance.brussels/soutenir" style="color:#1B3A6B;text-decoration:underline;">governance.brussels/soutenir</a>
</p>
<p style="margin:0;font-size:12px;color:#6b7280;">
<a href="https://governance.brussels" style="color:#6b7280;text-decoration:underline;">governance.brussels</a> &middot; <a href="mailto:contact@brusselsgovernance.be" style="color:#6b7280;text-decoration:underline;">contact@brusselsgovernance.be</a>
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
    const ip = clientIp(request.headers);
    const { allowed, remaining } = rateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans une minute.' },
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
        { error: 'Prénom et adresse email valide requis.' },
        { status: 400 },
      );
    }

    const { firstName, email } = parsed.data;

    if (!process.env.RESEND_API_KEY) {
      console.error('Livre preorder: RESEND_API_KEY is not set');
      return NextResponse.json(
        { error: 'Service email non configuré.' },
        { status: 503 },
      );
    }

    // Le journal d'abord, Resend ensuite. C'est la leçon du 16/04 au 08/09 :
    // tant que la seule trace vivait chez Resend, une panne silencieuse
    // effaçait la précommande. Un journal indisponible ne doit pour autant
    // jamais faire échouer le formulaire de quelqu'un.
    try {
      await recordPreorder({ email, firstName });
    } catch (err) {
      console.error('[livre-precommande-FAIL] journal indisponible', email, err);
    }

    const resend = getResend();

    // `sources` (pluriel) est la seule clé de ce nom déclarée sur le compte
    // Resend. Une propriété non déclarée est refusée : c'est le sinistre de
    // la PR #170, et c'est ce qui a fait disparaître les précommandes du
    // 16/04 au 08/09. Voir src/app/api/cron/contacts-healthcheck/route.ts.
    const properties = { sources: 'livre-precommande' };

    const created = await resendCall(() =>
      resend.contacts.create({
        email,
        firstName,
        unsubscribed: false,
        properties,
      }),
    );

    if (created.error) {
      // On n'interrompt pas la précommande pour autant : la personne a fait
      // sa part, et l'email de confirmation ci-dessous reste la trace qui
      // permet de la rattraper. Mais le silence, lui, n'est plus permis.
      console.error('[livre-precommande-FAIL]', email, created.error);
    } else {
      // Resend ne persiste pas les propriétés passées à create : il faut les
      // rejouer en update, comme le fait addContact() dans lib/resend.ts.
      const updated = await resendCall(() =>
        resend.contacts.update({ email, properties }),
      );
      if (updated.error) {
        console.error('[livre-precommande-FAIL]', email, updated.error);
      }
    }

    // Send confirmation email
    const { error: sendError } = await resendCall(() =>
      resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: 'Ta précommande de "La Lasagne" est confirmée',
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
      { error: 'Erreur interne. Veuillez réessayer.' },
      { status: 500 },
    );
  }
}
