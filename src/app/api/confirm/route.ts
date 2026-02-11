import { NextResponse } from 'next/server';
import { verifyConfirmToken, generateUnsubscribeToken } from '@/lib/token';
import { getResend, EMAIL_FROM, addContact, getContact } from '@/lib/resend';
import WelcomeEmail from '@/emails/welcome';

const welcomeSubjects: Record<string, string> = {
  fr: 'Bienvenue sur Brussels Governance Monitor',
  nl: 'Welkom bij Brussels Governance Monitor',
  en: 'Welcome to Brussels Governance Monitor',
  de: 'Willkommen bei Brussels Governance Monitor',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = body.token;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'missing_token' }, { status: 400 });
    }

    const payload = verifyConfirmToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'expired' }, { status: 410 });
    }

    const { email, locale, topics } = payload;

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
    }

    // If contact already exists, merge topics instead of ignoring
    const existing = await getContact(email);
    if (existing) {
      const mergedTopics = [...new Set([...existing.topics, ...topics])];
      if (mergedTopics.length !== existing.topics.length) {
        const { updateContactPreferences } = await import('@/lib/resend');
        await updateContactPreferences(email, existing.locale, mergedTopics);
      }
      return NextResponse.json({ success: true, topics: mergedTopics, alreadyConfirmed: true });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';
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

    // Delay to respect Resend rate limit (2 req/sec) after sending email
    await new Promise((r) => setTimeout(r, 1000));

    // Persist subscriber in Resend Contacts
    try {
      await addContact(email, locale, topics);
    } catch {
      // Contact persistence failure should not block the confirm flow
    }

    return NextResponse.json({ success: true, topics });
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
