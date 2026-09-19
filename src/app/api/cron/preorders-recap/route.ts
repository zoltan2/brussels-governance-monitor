// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { isValidCronAuth } from '@/lib/cron-auth';
import {
  listPreordersBetween,
  readRecapCursor,
  recapWindow,
  saveRecapCursor,
  RECAP_FIRST_WINDOW_MS,
  type PreorderRecord,
} from '@/lib/preorder-log';
import { escapeHtml } from '@/lib/html-escape';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Récap hebdomadaire des précommandes du livre, mardi 09:00 Europe/Bruxelles.
 *
 * Le mail part même à zéro précommande : c'est délibéré. Tant que la seule
 * trace d'une précommande vivait chez Resend, une panne silencieuse pouvait
 * durer quatre mois sans que rien ne l'indique (16/04 au 08/09/2026). Un
 * récap qui arrive chaque semaine transforme le silence en signal.
 *
 * La période couverte part du curseur du récap précédent (voir recapWindow),
 * pas de « maintenant moins sept jours » : heure d'été, heure d'hiver et
 * rattrapage systemd ne peuvent plus ni perdre ni doubler une précommande.
 */
const RECIPIENT = 'contact@brusselsgovernance.be';

const DATE_FMT = new Intl.DateTimeFormat('fr-BE', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Brussels',
});

const PERIOD_FMT = new Intl.DateTimeFormat('fr-BE', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Brussels',
});

interface Period {
  after: number;
  until: number;
}

function buildRecapEmail(
  rows: PreorderRecord[],
  period: Period,
  journalDown = false,
): string {
  // Le mail EST le détecteur de panne : s'il disparaît quand le journal
  // casse, un journal cassé produit exactement le même silence qu'une semaine
  // sans précommande. C'est la récidive du sinistre d'avril, à l'intérieur du
  // garde-fou censé l'empêcher. Il part donc toujours, en le disant.
  const alert = journalDown
    ? `<p style="margin:0 0 24px;padding:16px;background-color:#FEF6E7;border-left:3px solid #F2A900;font-size:14px;line-height:1.6;color:#374151;">
<strong>Le journal est illisible.</strong> Ce r&eacute;cap ne dit donc rien de la semaine
&eacute;coul&eacute;e&nbsp;: il ne faut pas lire ce z&eacute;ro comme une absence de pr&eacute;commande.
Regarder <code>journalctl -u bgm-cron@preorders-recap.service</code>.
</p>`
    : '';

  // Une précommande par ligne, ses trois champs empilés : l'ancien tableau à
  // trois colonnes débordait sous 441 px, le seul mail BGM dans ce cas. La
  // lecture reste linéaire pour un lecteur d'écran : date, prénom, adresse.
  const body = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid #e5e7eb;">
${rows
  .map(
    (r) => `<tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
<p style="margin:0;font-size:12px;line-height:1.4;color:#6b7280;">${DATE_FMT.format(new Date(r.created_at))}</p>
<p style="margin:2px 0 0;font-size:15px;line-height:1.4;font-weight:600;color:#1B3A6B;">${escapeHtml(r.firstName) || '&mdash;'}</p>
<p style="margin:2px 0 0;font-size:14px;line-height:1.4;color:#374151;word-break:break-all;"><a href="mailto:${escapeHtml(r.email)}" style="color:#1B3A6B;word-break:break-all;">${escapeHtml(r.email)}</a></p>
</td></tr>`,
  )
  .join('\n')}
</table>`
    : `<p style="margin:0 0 24px;padding:16px;background-color:#F7F8FC;border-left:3px solid #F2A900;font-size:14px;line-height:1.6;color:#374151;">
Aucune pr&eacute;commande cette semaine. Ce mail part quand m&ecirc;me&nbsp;: s'il cesse d'arriver, c'est le cron qui est cass&eacute;, pas la semaine qui est calme.
</p>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="only light">
<meta name="supported-color-schemes" content="light">
<meta name="x-apple-disable-message-reformatting"></head>
<body style="margin:0;padding:0;background-color:#F7F8FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F8FC;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;border:1px solid #e5e7eb;">

<tr><td style="padding:32px 32px 0;">
<p style="margin:0;font-size:14px;font-weight:600;color:#1B3A6B;letter-spacing:0.05em;">BRUSSELS GOVERNANCE MONITOR</p>
<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">R&eacute;cap hebdomadaire &mdash; pr&eacute;commandes &laquo;&nbsp;La Lasagne&nbsp;&raquo;</p>
</td></tr>

<tr><td style="padding:24px 32px 32px;">
<p style="margin:0;font-size:22px;font-weight:700;color:#1B3A6B;">
${rows.length} pr&eacute;commande${rows.length === 1 ? '' : 's'} cette semaine
</p>
<p style="margin:4px 0 20px;font-size:13px;color:#6b7280;">
Du ${PERIOD_FMT.format(new Date(period.after))} au ${PERIOD_FMT.format(new Date(period.until))}
</p>
${alert}${body}
<p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">
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

  // Une panne du journal ne doit jamais supprimer le mail : voir buildRecapEmail.
  // La lecture du curseur en fait partie : une base verrouillée l'empêche
  // aussi, et le mail doit alors partir en le disant.
  const now = Date.now();
  let period: Period = { after: now - RECAP_FIRST_WINDOW_MS, until: now };
  let rows: PreorderRecord[] = [];
  let journalDown = false;
  try {
    period = recapWindow(await readRecapCursor(), now);
    rows = await listPreordersBetween(period.after, period.until);
  } catch (err) {
    journalDown = true;
    console.error('[preorders-recap-FAIL] journal illisible', err);
  }

  const resend = getResend();
  const { error } = await resendCall(() =>
    resend.emails.send({
      from: EMAIL_FROM,
      to: RECIPIENT,
      subject: journalDown
        ? 'Précommandes « La Lasagne » : journal illisible'
        : `Précommandes « La Lasagne » : ${rows.length} cette semaine`,
      html: buildRecapEmail(rows, period, journalDown),
      tags: [{ name: 'type', value: 'preorders-recap' }],
    }),
  );

  if (error) {
    console.error('[preorders-recap-FAIL]', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }

  if (journalDown) {
    // Le mail est parti, mais le cron doit échouer pour que journald en garde
    // la trace et que le statut systemd ne dise pas « success ». Le curseur
    // ne bouge pas : le récap suivant reprendra la période non lue.
    return NextResponse.json(
      { ok: false, error: 'journal illisible' },
      { status: 500 },
    );
  }

  // Seulement après un envoi réussi. Si l'écriture échoue, le prochain récap
  // repartira de l'ancien curseur et recomptera cette période : un doublon
  // visible vaut mieux qu'une précommande perdue, mais il faut le signaler.
  try {
    await saveRecapCursor(period.until);
  } catch (err) {
    console.error('[preorders-recap-FAIL] curseur non enregistré', err);
    return NextResponse.json(
      { ok: false, error: 'curseur non enregistré', count: rows.length },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, count: rows.length });
}
