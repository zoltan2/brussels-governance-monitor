// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { pruneLogsSqlite, type LogStream } from '@/lib/chat-logs';
import { isValidCronAuth } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Daily prune of the SQLite chat-log streams (self-host only).
 *
 * On Vercel/Upstash, the LPUSH+LTRIM pair already caps each LIST at 10 000
 * entries on the hot path, so there is nothing to prune (getDb() is null →
 * no-op). On the self-hosted SQLite backend, INSERT has no built-in cap, so
 * this endpoint (hit by the bgm-cron-prune-logs systemd timer) trims each
 * stream back to the 10 000-entry ceiling. Auth: Bearer CRON_SECRET, like the
 * other /api/cron/* routes.
 */
const STREAMS: LogStream[] = ['usage', 'errors', 'feedback', 'email-gate'];

export async function GET(request: Request) {
  if (!isValidCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    // No SQLite backend (Vercel): Upstash LTRIM already caps the lists.
    return NextResponse.json({ ok: true, skipped: 'no sqlite backend' });
  }

  for (const stream of STREAMS) {
    pruneLogsSqlite(db, stream);
  }

  return NextResponse.json({ ok: true, pruned: STREAMS });
}
