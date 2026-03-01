// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { readGitHubFile } from '@/lib/github';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { generateUnsubscribeToken } from '@/lib/token';
import { collectDigestUpdates } from '@/lib/digest-updates';
import DigestEmail, { generateDigestPlainText } from '@/emails/digest';

function formatWeekRange(date: Date, locale: string): string {
  const localeMap: Record<string, string> = {
    fr: 'fr-BE',
    nl: 'nl-BE',
    en: 'en-GB',
    de: 'de-DE',
  };
  const end = new Date(date);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);

  const fmt = new Intl.DateTimeFormat(localeMap[locale] || 'fr-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const startDay = start.getDate();
  const endFormatted = fmt.format(end);
  return `${startDay} — ${endFormatted}`;
}

/**
 * POST /api/digest/test-send
 * Auth-protected — sends a test digest email to ADMIN_EMAIL
 * using the current pending-digest.json data.
 */
export const POST = auth(async function POST(req) {
  if (!req.auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json({ error: 'ADMIN_EMAIL not configured' }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

  // Read pending digest
  const file = await readGitHubFile('data/pending-digest.json');
  if (!file) {
    return NextResponse.json({ error: 'No pending digest found' }, { status: 404 });
  }

  const digest = JSON.parse(file.content);
  const locale = 'fr';

  // Calculate cutoff — use weekStart if available, fallback to 7-day
  const cutoff = digest.weekStart || (() => {
    const createdAt = new Date(digest.created_at);
    const sevenDaysAgo = new Date(createdAt);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return sevenDaysAgo.toISOString().split('T')[0];
  })();

  // Collect all updated content
  const { byLocale } = collectDigestUpdates(cutoff, siteUrl);
  const updates = byLocale[locale] || [];

  const createdAt = new Date(digest.created_at);
  const weekOf = formatWeekRange(createdAt, locale);
  const weekNum = parseInt(digest.week.split('-w')[1], 10);
  const unsubToken = generateUnsubscribeToken(adminEmail);
  const unsubscribeUrl = `${siteUrl}/${locale}/subscribe/preferences?token=${encodeURIComponent(unsubToken)}`;

  const emailProps = {
    locale,
    updates,
    weekOf,
    unsubscribeUrl,
    summaryLine: digest.summary[locale] || digest.summary.fr,
    weeklyNumber: {
      value: digest.weeklyNumber.value,
      label: digest.weeklyNumber.label[locale] || digest.weeklyNumber.label.fr,
      source: digest.weeklyNumber.source[locale] || digest.weeklyNumber.source.fr,
    },
    closingNote: digest.closingNote[locale] || digest.closingNote.fr,
    commitmentCount: digest.commitmentCount,
    siteUrl,
    feedbackYesUrl: `${siteUrl}/digest/feedback?week=${digest.week}&vote=yes&lang=${locale}`,
    feedbackNoUrl: `${siteUrl}/digest/feedback?week=${digest.week}&vote=no&lang=${locale}`,
  };

  const resend = getResend();
  const { error } = await resendCall(() =>
    resend.emails.send({
      from: EMAIL_FROM,
      to: adminEmail,
      replyTo: adminEmail,
      subject: `[TEST] BGM Digest #${weekNum} — ${weekOf}`,
      react: DigestEmail(emailProps),
      text: generateDigestPlainText(emailProps),
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [{ name: 'type', value: 'digest-test' }],
    }),
  );

  if (error) {
    return NextResponse.json({ error: 'Failed to send test email', detail: JSON.stringify(error) }, { status: 500 });
  }

  return NextResponse.json({ success: true, sentTo: adminEmail });
});
