import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResend, EMAIL_FROM, TOPICS } from '@/lib/resend';
import { generateConfirmToken } from '@/lib/token';
import ConfirmEmail from '@/emails/confirm';

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
    const token = generateConfirmToken({ email, locale, topics });
    const confirmUrl = `${siteUrl}/api/confirm?token=${encodeURIComponent(token)}`;

    const resend = getResend();
    const { error: sendError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject:
        locale === 'nl'
          ? 'Bevestig uw inschrijving — Brussels Governance Monitor'
          : 'Confirmez votre inscription — Brussels Governance Monitor',
      react: ConfirmEmail({ locale, confirmUrl }),
      tags: [
        { name: 'type', value: 'confirm' },
        { name: 'locale', value: locale },
      ],
    });

    if (sendError) {
      console.error('Resend error:', sendError);
      return NextResponse.json(
        { error: 'Failed to send confirmation email' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, requiresConfirmation: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
