import { NextResponse } from 'next/server';
import { verifyConfirmToken, generateUnsubscribeToken } from '@/lib/token';
import { getResend, EMAIL_FROM } from '@/lib/resend';
import WelcomeEmail from '@/emails/welcome';

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
    const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}&locale=${locale}`;
    const resend = getResend();

    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject:
        locale === 'nl'
          ? 'Welkom bij Brussels Governance Monitor'
          : 'Bienvenue sur Brussels Governance Monitor',
      react: WelcomeEmail({
        locale: locale as 'fr' | 'nl',
        topics,
        unsubscribeUrl,
      }),
      tags: [
        { name: 'type', value: 'welcome' },
        { name: 'locale', value: locale },
        ...topics.map((t) => ({ name: 'topic', value: t })),
      ],
    });

    return NextResponse.redirect(
      `${siteUrl}/${locale}/subscribe/confirmed?status=success&topics=${topics.join(',')}`
    );
  } catch {
    return NextResponse.redirect(
      `${siteUrl}/${locale}/subscribe/confirmed?status=error`
    );
  }
}
