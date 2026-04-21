// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOG_DIR = process.env.VERCEL
  ? '/tmp'
  : path.join(process.cwd(), 'logs');

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
  locale?: string;
  has_email?: boolean;
  has_comment?: boolean;
};

async function readJsonl<T>(file: string): Promise<T[]> {
  let raw: string;
  try {
    raw = await fs.readFile(path.join(LOG_DIR, file), 'utf-8');
  } catch {
    return [];
  }
  const out: T[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      /* skip malformed */
    }
  }
  return out;
}

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
    readJsonl<UsageEntry>('chat-usage.jsonl'),
    readJsonl<ErrorEntry>('chat-errors.jsonl'),
    readJsonl<FeedbackEntry>('chat-feedback.jsonl'),
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

  const feedbackByReason = new Map<string, number>();
  for (const f of feedback24h) {
    const k = f.reason ?? 'unknown';
    feedbackByReason.set(k, (feedbackByReason.get(k) ?? 0) + 1);
  }

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
  lines.push(`Feedback (24h)     : ${feedback24h.length}`);
  if (feedbackByReason.size > 0) {
    lines.push('Par raison :');
    for (const [reason, count] of feedbackByReason) {
      lines.push(`  · ${count}× ${reason}`);
    }
  }
  lines.push('');

  if (isVercel) {
    lines.push('Note : en production (Vercel) les logs sont envoyés sur stdout.');
    lines.push('Ce digest ne lit que le fichier local /tmp — non persistant entre');
    lines.push('invocations. Pour un comptage exact : Vercel Logs dashboard,');
    lines.push('ou brancher un log drain vers Upstash/Logflare/BetterStack.');
  } else {
    lines.push(`Source : ${LOG_DIR}/chat-*.jsonl (lecture locale).`);
  }

  const resend = getResend();
  const { error: sendError } = await resendCall(() =>
    resend.emails.send({
      from: EMAIL_FROM,
      to: adminEmail,
      subject: `[BGM Chat] Digest 24h — ${usage24h.length} req / ${errors24h.length} err / ${feedback24h.length} fb`,
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
