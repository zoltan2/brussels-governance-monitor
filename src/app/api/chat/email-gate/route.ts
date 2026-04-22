// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  getContact,
  getResend,
  EMAIL_FROM,
  resendCall,
  getTopics,
  mergeContactSources,
} from '@/lib/resend';
import { generateConfirmToken } from '@/lib/token';
import { rateLimit } from '@/lib/rate-limit';
import ConfirmEmail from '@/emails/confirm';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email().max(200),
  optInDigest: z.boolean().default(false),
  locale: z.enum(['fr', 'nl', 'en', 'de']),
  // Honeypot — the real form keeps this empty. Bots that auto-fill every
  // input fill it. Server silently returns success without touching Resend.
  website: z.string().max(500).optional(),
});

const LOG_DIR = process.env.VERCEL
  ? '/tmp'
  : path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'chat-email-gate.jsonl');

/**
 * Structured log — never writes the raw email. A SHA-256 digest lets us count
 * unique email-gate opens per day without storing PII at rest.
 */
function logEmailGateAsync(entry: Record<string, unknown>): void {
  if (process.env.VERCEL) {
    console.log('[chat-email-gate]', JSON.stringify(entry));
    return;
  }
  const line = JSON.stringify(entry) + '\n';
  fs.mkdir(LOG_DIR, { recursive: true })
    .then(() => fs.appendFile(LOG_FILE, line))
    .catch((err) => console.error('[chat-email-gate] log failed:', err));
}

function emailDigest(email: string): string {
  const secret = process.env.CHAT_SESSION_SECRET ?? 'fallback';
  return createHash('sha256')
    .update(`${secret}|${email.toLowerCase().trim()}`)
    .digest('hex')
    .slice(0, 12);
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed } = rateLimit(ip, { max: 5, bucket: 'chat-email-gate' });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Honeypot trap — return success without touching Resend or logging the
    // submission, so a bot can't distinguish its spam from a legit flow.
    if (parsed.data.website && parsed.data.website.length > 0) {
      return NextResponse.json({
        success: true,
        alreadySubscribed: false,
        confirmationSent: false,
      });
    }

    const { email, optInDigest, locale } = parsed.data;
    const emailHash = emailDigest(email);

    let alreadySubscribed = false;
    let confirmationSent = false;

    // If the user explicitly opted into the digest, route them through the
    // same confirmation flow as /api/subscribe. Chat unlock is decoupled and
    // happens client-side regardless — we don't block unlock on Resend.
    if (optInDigest && process.env.RESEND_API_KEY) {
      try {
        const existing = await getContact(email);
        if (existing) {
          alreadySubscribed = true;
          // Tag the existing contact with 'chat' so we can see this channel
          // in Resend even though they signed up another way originally.
          await mergeContactSources(email, ['chat']);
        } else {
          const siteUrl =
            process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';
          const topics = getTopics(); // default = full digest (all topics)
          const token = generateConfirmToken({
            email,
            locale,
            topics,
            source: 'chat',
          });
          const confirmUrl = `${siteUrl}/${locale}/subscribe/confirm?token=${encodeURIComponent(token)}`;
          const resend = getResend();
          const { error: sendError } = await resendCall(() =>
            resend.emails.send({
              from: EMAIL_FROM,
              to: email,
              subject:
                {
                  fr: 'Confirmez votre inscription — Brussels Governance Monitor',
                  nl: 'Bevestig uw inschrijving — Brussels Governance Monitor',
                  en: 'Confirm your subscription — Brussels Governance Monitor',
                  de: 'Bestätigen Sie Ihre Anmeldung — Brussels Governance Monitor',
                }[locale] ||
                'Confirmez votre inscription — Brussels Governance Monitor',
              react: ConfirmEmail({ locale, confirmUrl }),
              tags: [
                { name: 'type', value: 'confirm' },
                { name: 'locale', value: locale },
                { name: 'source', value: 'chat-email-gate' },
              ],
            }),
          );
          if (!sendError) confirmationSent = true;
          else console.error('[chat-email-gate] Resend error:', sendError);
        }
      } catch (err) {
        // Any failure in the digest flow must NOT block chat unlock.
        console.error('[chat-email-gate] opt-in flow failed:', err);
      }
    }

    logEmailGateAsync({
      ts: new Date().toISOString(),
      email_hash: emailHash,
      opt_in_digest: optInDigest,
      locale,
      already_subscribed: alreadySubscribed,
      confirmation_sent: confirmationSent,
    });

    return NextResponse.json({
      success: true,
      alreadySubscribed,
      confirmationSent,
    });
  } catch (err) {
    console.error('[chat-email-gate] unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
