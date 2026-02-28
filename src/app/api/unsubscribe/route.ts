// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/token';
import { getResend, EMAIL_FROM, removeContact, resendCall } from '@/lib/resend';
import GoodbyeEmail from '@/emails/goodbye';

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

export async function POST(request: Request) {
  let body: { token?: string; rating?: number; feedback?: string; locale?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { token, rating, feedback, locale: bodyLocale } = body;

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

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
