// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const feedbackSchema = z.object({
  reason: z.enum([
    'wrong',
    'irrelevant',
    'hallucinated',
    'other',
    'up',
    'session-rating',
  ]),
  userQuestion: z.string().max(500).optional(),
  assistantAnswer: z.string().max(1000).optional(),
  comment: z.string().max(500).optional(),
  email: z.string().email().optional(),
  value: z.number().int().min(1).max(3).optional(),
  messageCount: z.number().int().min(0).max(100).optional(),
  provider: z.string().max(20),
  locale: z.string().max(10),
});

const FEEDBACK_RECIPIENT = 'feedback@brusselsgovernance.be';

// Reasons that warrant an inbox email — not up-votes or silent ratings.
const EMAILABLE_REASONS = new Set(['wrong', 'irrelevant', 'hallucinated', 'other']);

const LOG_DIR = process.env.VERCEL
  ? '/tmp'
  : path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'chat-feedback.jsonl');

function logFeedbackAsync(entry: Record<string, unknown>): void {
  if (process.env.VERCEL) {
    console.log('[chat-feedback]', JSON.stringify(entry));
    return;
  }
  const line = JSON.stringify(entry) + '\n';
  fs.mkdir(LOG_DIR, { recursive: true })
    .then(() => fs.appendFile(LOG_FILE, line))
    .catch((err) => console.error('[chat-feedback] log failed:', err));
}

function sanitizeTag(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60);
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed } = rateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      reason,
      userQuestion,
      assistantAnswer,
      comment,
      email,
      value,
      messageCount,
      provider,
      locale,
    } = parsed.data;

    logFeedbackAsync({
      ts: new Date().toISOString(),
      reason,
      provider,
      locale,
      session: 'anonymous',
      has_email: Boolean(email),
      has_comment: Boolean(comment),
      value: value ?? null,
      message_count: messageCount ?? null,
    });

    // Only email on negative/ambiguous reasons — not up-votes or session ratings.
    if (!EMAILABLE_REASONS.has(reason)) {
      return NextResponse.json({ success: true });
    }

    if (!process.env.RESEND_API_KEY) {
      console.log('[ChatFeedback]', {
        reason,
        provider,
        locale,
        hasEmail: Boolean(email),
      });
      return NextResponse.json({ success: true });
    }

    const resend = getResend();
    const { error: sendError } = await resendCall(() =>
      resend.emails.send({
        from: EMAIL_FROM,
        to: FEEDBACK_RECIPIENT,
        subject: `[BGM Chat Feedback] ${reason} — ${locale}`,
        text: [
          `Raison : ${reason}`,
          `Fournisseur : ${provider}`,
          `Locale : ${locale}`,
          '---',
          `Question : ${userQuestion ?? '(non fournie)'}`,
          `Réponse : ${assistantAnswer ?? '(non fournie)'}`,
          '---',
          `Commentaire : ${comment || '(aucun)'}`,
          `Email : ${email || '(anonyme)'}`,
        ].join('\n'),
        replyTo: email || undefined,
        tags: [
          { name: 'type', value: 'chat-feedback' },
          { name: 'reason', value: sanitizeTag(reason) },
          { name: 'provider', value: sanitizeTag(provider) },
        ],
      }),
    );

    if (sendError) {
      console.error('Resend chat-feedback error:', sendError);
      return NextResponse.json(
        { error: 'Failed to send feedback' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
