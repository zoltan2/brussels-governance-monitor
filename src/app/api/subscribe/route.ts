import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResend, EMAIL_FROM, TOPICS } from '@/lib/resend';
import WelcomeEmail from '@/emails/welcome';

const subscribeSchema = z.object({
  email: z.string().email(),
  locale: z.enum(['fr', 'nl']),
  topics: z.array(z.enum(TOPICS)).min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { email, locale, topics } = parsed.data;

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 },
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const unsubscribeUrl = `${siteUrl}/${locale}`;

    // Create contact in Resend with audience
    // Note: in production, use Resend Audiences + Contacts API
    // For MVP, we send the welcome email directly

    const resend = getResend();
    const { error: sendError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject:
        locale === 'nl'
          ? 'Welkom bij Brussels Governance Monitor'
          : 'Bienvenue sur Brussels Governance Monitor',
      react: WelcomeEmail({ locale, topics, unsubscribeUrl }),
      tags: [
        { name: 'type', value: 'welcome' },
        { name: 'locale', value: locale },
        ...topics.map((t) => ({ name: 'topic', value: t })),
      ],
    });

    if (sendError) {
      console.error('Resend error:', sendError);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
