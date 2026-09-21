// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/client-ip';
import { secretCorrespond } from '@/lib/cron-auth';

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
    // La limitation de debit passe AVANT le controle du jeton. Elle etait apres :
    // les tentatives de devinette n'etaient donc jamais comptees, alors que la
    // route publie `Access-Control-Allow-Origin: *` et que n'importe quelle page
    // web peut donc l'interroger en boucle (audit 21/09).
    const ip = clientIp(request.headers);
    const { allowed } = rateLimit(ip, { bucket: 'intel-inbox' });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: CORS_HEADERS });
    }

    // Comparaison a temps constant, comme src/lib/cron-auth.ts et src/lib/token.ts.
    // Le `!==` sur chaine court-circuite au premier caractere different. A travers
    // Cloudflare et Caddy le bruit reseau couvre largement l'ecart, donc
    // l'exploitation a distance reste improbable : c'est une mise en conformite
    // avec le reste du depot, pas la fermeture d'une faille demontree.
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token || !secretCorrespond(token, process.env.INBOX_SECRET)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
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
      // Meme raisonnement que contact et feedback : pas de contenu en clair dans
      // le journal. Cette route est authentifiee par jeton, l'appelant est donc
      // connu : on le laisse accepter en developpement.
      console.log('[intel-inbox] Resend non configure', {
        url,
        title,
        hasNote: Boolean(note),
        hasSelection: Boolean(selectedText),
      });
      const ctaUrl: string | undefined = process.env.INBOX_CTA_URL || undefined;
      const ctaLabel: string | undefined = process.env.INBOX_CTA_LABEL || undefined;
      return NextResponse.json(
        { success: true, ...(ctaUrl && ctaLabel ? { ctaUrl, ctaLabel } : {}) },
        { headers: CORS_HEADERS },
      );
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

    const ctaUrl: string | undefined = process.env.INBOX_CTA_URL || undefined;
    const ctaLabel: string | undefined = process.env.INBOX_CTA_LABEL || undefined;
    return NextResponse.json(
      { success: true, ...(ctaUrl && ctaLabel ? { ctaUrl, ctaLabel } : {}) },
      { headers: CORS_HEADERS },
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS_HEADERS });
  }
}
