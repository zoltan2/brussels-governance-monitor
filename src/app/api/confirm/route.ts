import { NextResponse } from 'next/server';
import { verifyConfirmToken, generateUnsubscribeToken } from '@/lib/token';
import { getResend, EMAIL_FROM, addContact } from '@/lib/resend';
import WelcomeEmail from '@/emails/welcome';

const welcomeSubjects: Record<string, string> = {
  fr: 'Bienvenue sur Brussels Governance Monitor',
  nl: 'Welkom bij Brussels Governance Monitor',
  en: 'Welcome to Brussels Governance Monitor',
  de: 'Willkommen bei Brussels Governance Monitor',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(
      `${siteUrl}/fr/subscribe/confirmed?status=error`
    );
  }

  const payload = verifyConfirmToken(token);
  if (!payload) {
    return NextResponse.redirect(
      `${siteUrl}/fr/subscribe/confirmed?status=expired`
    );
  }

  const { email, locale, topics } = payload;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.redirect(
      `${siteUrl}/${locale}/subscribe/confirmed?status=error`
    );
  }

  try {
    const unsubToken = generateUnsubscribeToken(email);
    const unsubscribeUrl = `${siteUrl}/${locale}/subscribe/preferences?token=${encodeURIComponent(unsubToken)}`;
    const resend = getResend();

    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: welcomeSubjects[locale] || welcomeSubjects.fr,
      react: WelcomeEmail({
        locale,
        topics,
        unsubscribeUrl,
      }),
      tags: [
        { name: 'type', value: 'welcome' },
        { name: 'locale', value: locale },
        { name: 'topics', value: topics.join('-') },
      ],
    });

    // Persist subscriber in Resend Contacts (non-blocking)
    try {
      await addContact(email, locale, topics);
    } catch {
      // Contact persistence failure should not block the confirm flow
    }

    return NextResponse.redirect(
      `${siteUrl}/${locale}/subscribe/confirmed?status=success&topics=${topics.join(',')}`
    );
  } catch {
    return NextResponse.redirect(
      `${siteUrl}/${locale}/subscribe/confirmed?status=error`
    );
  }
}
