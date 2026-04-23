// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { readLogs, isPersistentStoreConfigured } from '@/lib/chat-logs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UsageEntry = {
  ts: string;
  locale?: string;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  dossier_count?: number;
  question?: string;
  session?: string;
};

type ErrorEntry = {
  ts: string;
  locale?: string;
  session?: string;
  error?: string;
  context?: unknown;
};

type FeedbackEntry = {
  ts: string;
  reason?: string;
  provider?: string;
  locale?: string;
  has_email?: boolean;
  has_comment?: boolean;
  value?: number | null;
  message_count?: number | null;
};

function withinLastDay(iso: string, now: number): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return now - t <= 24 * 60 * 60 * 1000;
}

function mostFrequent(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let top: string | null = null;
  let max = 0;
  for (const [k, v] of counts) {
    if (v > max) {
      max = v;
      top = k;
    }
  }
  return top;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY is required' },
      { status: 500 },
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json(
      { error: 'ADMIN_EMAIL is required' },
      { status: 500 },
    );
  }

  const now = Date.now();
  const isVercel = Boolean(process.env.VERCEL);

  const [usage, errors, feedback] = await Promise.all([
    readLogs<UsageEntry>('usage'),
    readLogs<ErrorEntry>('errors'),
    readLogs<FeedbackEntry>('feedback'),
  ]);

  const usage24h = usage.filter((u) => withinLastDay(u.ts, now));
  const errors24h = errors.filter((e) => withinLastDay(e.ts, now));
  const feedback24h = feedback.filter((f) => withinLastDay(f.ts, now));

  const uniqueSessions = new Set(
    usage24h.map((u) => u.session).filter((s): s is string => Boolean(s)),
  ).size;
  const completionSamples = usage24h
    .map((u) => u.completion_tokens)
    .filter((v): v is number => typeof v === 'number');
  const avgOut =
    completionSamples.length > 0
      ? Math.round(
          completionSamples.reduce((a, b) => a + b, 0) / completionSamples.length,
        )
      : null;
  const topLocale = mostFrequent(
    usage24h.map((u) => u.locale).filter((l): l is string => Boolean(l)),
  );

  // Split feedback by kind for cleaner reporting.
  const thumbsUp = feedback24h.filter((f) => f.reason === 'up').length;
  const sessionRatings = feedback24h.filter(
    (f) => f.reason === 'session-rating',
  );
  const problemReports = feedback24h.filter(
    (f) => f.reason && !['up', 'session-rating'].includes(f.reason),
  );

  const feedbackByReason = new Map<string, number>();
  for (const f of problemReports) {
    const k = f.reason ?? 'unknown';
    feedbackByReason.set(k, (feedbackByReason.get(k) ?? 0) + 1);
  }

  const ratingBuckets: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  for (const r of sessionRatings) {
    if (r.value === 1 || r.value === 2 || r.value === 3) {
      ratingBuckets[r.value] += 1;
    }
  }
  const avgRating =
    sessionRatings.length > 0
      ? (
          sessionRatings.reduce(
            (sum, r) => sum + (typeof r.value === 'number' ? r.value : 0),
            0,
          ) / sessionRatings.length
        ).toFixed(2)
      : null;

  const topErrors = errors24h
    .map((e) => e.error ?? 'unknown')
    .reduce<Map<string, number>>((m, v) => {
      m.set(v, (m.get(v) ?? 0) + 1);
      return m;
    }, new Map());
  const topErrorsSorted = [...topErrors.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const lines: string[] = [];
  lines.push('[BGM Chat] Digest 24h');
  lines.push('====================');
  lines.push('');
  lines.push(`Requêtes (24h)     : ${usage24h.length}`);
  lines.push(`Sessions uniques   : ${uniqueSessions}`);
  lines.push(`Tokens out (moy.)  : ${avgOut ?? '—'}`);
  lines.push(`Locale dominante   : ${topLocale ?? '—'}`);
  lines.push('');
  lines.push(`Erreurs (24h)      : ${errors24h.length}`);
  if (topErrorsSorted.length > 0) {
    lines.push('Top erreurs :');
    for (const [msg, count] of topErrorsSorted) {
      lines.push(`  · ${count}× ${msg.slice(0, 120)}`);
    }
  }
  lines.push('');
  lines.push(`Feedback total 24h : ${feedback24h.length}`);
  lines.push(`  👍 utile         : ${thumbsUp}`);
  lines.push(`  👎 problème      : ${problemReports.length}`);
  if (feedbackByReason.size > 0) {
    for (const [reason, count] of feedbackByReason) {
      lines.push(`      · ${count}× ${reason}`);
    }
  }
  lines.push(`  ★ CSAT session   : ${sessionRatings.length}`);
  if (sessionRatings.length > 0) {
    lines.push(`      😊 satisfait  : ${ratingBuckets[3]}`);
    lines.push(`      😐 neutre     : ${ratingBuckets[2]}`);
    lines.push(`      😞 insatisfait: ${ratingBuckets[1]}`);
    lines.push(`      moyenne      : ${avgRating} / 3`);
  }
  lines.push('');

  const redisConfigured = isPersistentStoreConfigured();
  if (isVercel && !redisConfigured) {
    lines.push('Note : aucun store Redis configuré (UPSTASH_REDIS_REST_URL ou');
    lines.push('KV_REST_API_URL) — les logs ne persistent pas entre invocations.');
    lines.push('Ajoute l\'intégration Upstash ou Vercel KV pour un comptage exact.');
  } else if (redisConfigured) {
    lines.push('Source : Upstash Redis (chat:* keys).');
  } else {
    lines.push('Source : ./logs/chat-*.jsonl (lecture locale).');
  }

  const resend = getResend();
  const { error: sendError } = await resendCall(() =>
    resend.emails.send({
      from: EMAIL_FROM,
      to: adminEmail,
      subject: `[BGM Chat] Digest 24h — ${usage24h.length} req / 👍${thumbsUp} 👎${problemReports.length} ★${sessionRatings.length} / ${errors24h.length} err`,
      text: lines.join('\n'),
      tags: [
        { name: 'type', value: 'chat-digest' },
        { name: 'env', value: isVercel ? 'vercel' : 'local' },
      ],
    }),
  );

  if (sendError) {
    console.error('[chat-digest] send failed:', sendError);
    return NextResponse.json(
      { error: 'Failed to send digest' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    usage: usage24h.length,
    errors: errors24h.length,
    feedback: feedback24h.length,
  });
}
