// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { getResend, addContact, resendCall } from '@/lib/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Daily smoke test for the Resend Contacts pipeline.
 * Creates a throwaway contact with all expected properties (locale, topics,
 * sources). If Resend rejects any property, addContact throws and we emit
 * `[contacts-healthcheck-FAIL]` to Vercel logs + return 500.
 *
 * Background: PR #170 (2026-04-22) shipped a `sources` property that did not
 * exist on the Resend account, silently dropping every new subscriber for 5
 * days before being noticed.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });
  }

  const probeEmail = `healthcheck-${Date.now()}@governance.brussels`;

  try {
    await addContact(probeEmail, 'fr', ['budget'], ['healthcheck']);
  } catch (err) {
    console.error('[contacts-healthcheck-FAIL]', probeEmail, err);
    return NextResponse.json(
      { ok: false, probeEmail, error: String(err) },
      { status: 500 },
    );
  }

  try {
    const resend = getResend();
    await resendCall(() => resend.contacts.remove({ email: probeEmail }));
  } catch (err) {
    console.warn('[contacts-healthcheck] cleanup failed (non-blocking)', err);
  }

  return NextResponse.json({ ok: true, probedAt: new Date().toISOString() });
}
