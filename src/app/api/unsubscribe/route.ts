// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyUnsubscribeToken } from '@/lib/token';
import { getResend, EMAIL_FROM, removeContact, resendCall } from '@/lib/resend';
import GoodbyeEmail from '@/emails/goodbye';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/client-ip';
import { bodyTooLargeRefusal } from '@/lib/request-guards';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const locale = searchParams.get('locale') || 'fr';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(
      `${siteUrl}/${locale}/subscribe/unsubscribed?status=error`
    );
  }

  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return NextResponse.redirect(
      `${siteUrl}/${locale}/subscribe/unsubscribed?status=error`
    );
  }

  const { email } = payload;

  // Mark as unsubscribed in Resend Contacts
  if (process.env.RESEND_API_KEY) {
    try {
      await removeContact(email);
    } catch {
      // Contact update failure should not block the unsubscribe flow
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL;

  // Notify admin about the unsubscribe
  if (adminEmail && process.env.RESEND_API_KEY) {
    try {
      const resend = getResend();
      await resendCall(() =>
        resend.emails.send({
          from: EMAIL_FROM,
          to: adminEmail,
          subject: `[BGM] Désabonnement : ${email}`,
          text: `L'utilisateur ${email} s'est désabonné des alertes Brussels Governance Monitor.\n\nDate : ${new Date().toISOString()}\n\nLe contact a été automatiquement marqué comme désabonné dans Resend.`,
          tags: [{ name: 'type', value: 'unsubscribe-notification' }],
        }),
      );
    } catch {
      // Notification failure should not block the unsubscribe flow
    }
  }

  return NextResponse.redirect(
    `${siteUrl}/${locale}/subscribe/unsubscribed?status=success`
  );
}

/**
 * Corps du desabonnement.
 *
 * Il n'etait pas valide du tout : `feedback` et `rating` etaient pris tels quels
 * et interpoles dans un email vers l'administrateur. Combine a l'absence de
 * limitation de debit (seule route POST publique dans ce cas), cela faisait un
 * amplificateur d'emails : avec un jeton legitime, une boucle expediait deux
 * envois Resend par appel, epuisait le quota mensuel — donc plus AUCUN email de
 * confirmation ni de digest ne partait pour personne — et noyait la boite de
 * l'exploitant (audit 21/09).
 */
const unsubscribeSchema = z.object({
  token: z.string().min(1).max(4096),
  rating: z.number().int().min(1).max(5).optional(),
  feedback: z.string().max(2000).optional(),
  locale: z.string().min(1).max(10).optional(),
});

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const { allowed } = rateLimit(ip, { max: 5, bucket: 'unsubscribe' });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const tropGros = bodyTooLargeRefusal(request.headers);
  if (tropGros) {
    return NextResponse.json({ error: tropGros }, { status: 413 });
  }

  let brut: unknown;
  try {
    brut = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = unsubscribeSchema.safeParse(brut);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { token, rating, feedback, locale: bodyLocale } = parsed.data;

  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 },
    );
  }

  const { email } = payload;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // Mark as unsubscribed in Resend Contacts
  if (process.env.RESEND_API_KEY) {
    try {
      await removeContact(email);
    } catch {
      // Contact update failure should not block the unsubscribe flow
    }
  }

  if (process.env.RESEND_API_KEY) {
    const resend = getResend();

    // Send goodbye email to user
    try {
      const emailLocale = bodyLocale && ['fr', 'nl', 'en', 'de'].includes(bodyLocale)
        ? bodyLocale
        : 'fr';
      const goodbyeSubjects: Record<string, string> = {
        fr: 'Votre désinscription est confirmée',
        nl: 'Uw uitschrijving is bevestigd',
        en: 'Your unsubscription is confirmed',
        de: 'Ihre Abmeldung ist bestätigt',
      };
      await resendCall(() =>
        resend.emails.send({
          from: EMAIL_FROM,
          to: email,
          subject: goodbyeSubjects[emailLocale] || goodbyeSubjects.fr,
          react: GoodbyeEmail({
            locale: emailLocale,
            siteUrl,
          }),
          tags: [{ name: 'type', value: 'goodbye' }],
        }),
      );
    } catch {
      // Goodbye email failure should not block the unsubscribe flow
    }

    // Notify admin with rating and feedback
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      try {
        const ratingLine = rating
          ? `\nNote : ${rating}/5`
          : '\nNote : non renseignée';
        const feedbackLine = feedback
          ? `\nCommentaire : ${feedback}`
          : '\nCommentaire : aucun';

        await resendCall(() =>
          resend.emails.send({
            from: EMAIL_FROM,
            to: adminEmail,
            subject: `[BGM] Désabonnement : ${email}`,
            text: `L'utilisateur ${email} s'est désabonné des alertes Brussels Governance Monitor.\n\nDate : ${new Date().toISOString()}${ratingLine}${feedbackLine}\n\nLe contact a été automatiquement marqué comme désabonné dans Resend.`,
            tags: [{ name: 'type', value: 'unsubscribe-notification' }],
          }),
        );
      } catch {
        // Notification failure should not block the unsubscribe flow
      }
    }
  }

  return NextResponse.json({ success: true });
}
