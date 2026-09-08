// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { isValidCronAuth } from '@/lib/cron-auth';
import { listPreordersSince, type PreorderRecord } from '@/lib/preorder-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Récap hebdomadaire des précommandes du livre, mardi 09:00 Europe/Bruxelles.
 *
 * Le mail part même à zéro précommande : c'est délibéré. Tant que la seule
 * trace d'une précommande vivait chez Resend, une panne silencieuse pouvait
 * durer quatre mois sans que rien ne l'indique (16/04 au 08/09/2026). Un
 * récap qui arrive chaque semaine transforme le silence en signal.
 */
const RECIPIENT = 'contact@brusselsgovernance.be';
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const DATE_FMT = new Intl.DateTimeFormat('fr-BE', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Brussels',
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildRecapEmail(rows: PreorderRecord[]): string {
  const body = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px;">
<tr>
<th align="left" style="padding:8px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:1px solid #e5e7eb;">Date</th>
<th align="left" style="padding:8px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:1px solid #e5e7eb;">Pr&eacute;nom</th>
<th align="left" style="padding:8px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:1px solid #e5e7eb;">Email</th>
</tr>
${rows
  .map(
    (r) => `<tr>
<td style="padding:10px 12px;font-size:14px;color:#374151;border-bottom:1px solid #f3f4f6;">${DATE_FMT.format(new Date(r.created_at))}</td>
<td style="padding:10px 12px;font-size:14px;color:#1B3A6B;font-weight:600;border-bottom:1px solid #f3f4f6;">${escapeHtml(r.firstName) || '&mdash;'}</td>
<td style="padding:10px 12px;font-size:14px;color:#374151;border-bottom:1px solid #f3f4f6;"><a href="mailto:${escapeHtml(r.email)}" style="color:#1B3A6B;">${escapeHtml(r.email)}</a></td>
</tr>`,
  )
  .join('\n')}
</table>`
    : `<p style="margin:0 0 24px;padding:16px;background-color:#F7F8FC;border-left:3px solid #F2A900;font-size:14px;line-height:1.6;color:#374151;">
Aucune pr&eacute;commande cette semaine. Ce mail part quand m&ecirc;me&nbsp;: s'il cesse d'arriver, c'est le cron qui est cass&eacute;, pas la semaine qui est calme.
</p>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#F7F8FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F8FC;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;border:1px solid #e5e7eb;">

<tr><td style="padding:32px 32px 0;">
<p style="margin:0;font-size:14px;font-weight:600;color:#1B3A6B;letter-spacing:0.05em;">BRUSSELS GOVERNANCE MONITOR</p>
<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">R&eacute;cap hebdomadaire &mdash; pr&eacute;commandes &laquo;&nbsp;La Lasagne&nbsp;&raquo;</p>
</td></tr>

<tr><td style="padding:24px 32px 32px;">
<p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1B3A6B;">
${rows.length} pr&eacute;commande${rows.length === 1 ? '' : 's'} cette semaine
</p>
${body}
<p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">
Source&nbsp;: le journal des pr&eacute;commandes, &eacute;crit avant tout appel &agrave; Resend. Il ne d&eacute;pend ni de la cr&eacute;ation de contact ni de la r&eacute;tention de 30&nbsp;jours du journal d'emails.
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function GET(request: Request) {
  if (!isValidCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });
  }

  const rows = await listPreordersSince(Date.now() - WINDOW_MS);

  const resend = getResend();
  const { error } = await resendCall(() =>
    resend.emails.send({
      from: EMAIL_FROM,
      to: RECIPIENT,
      subject: `Précommandes « La Lasagne » : ${rows.length} cette semaine`,
      html: buildRecapEmail(rows),
      tags: [{ name: 'type', value: 'preorders-recap' }],
    }),
  );

  if (error) {
    console.error('[preorders-recap-FAIL]', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}
