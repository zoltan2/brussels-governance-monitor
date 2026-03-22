// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { getDomainCards } from '@/lib/content';
import { readGitHubFile, writeGitHubFile } from '@/lib/github';
import { getResend, EMAIL_FROM, listActiveContacts, resendCall } from '@/lib/resend';
import { generateDigestApprovalToken, generateUnsubscribeToken } from '@/lib/token';
import { collectDigestUpdates, generateSummaryLine } from '@/lib/digest-updates';
import DigestPreviewEmail from '@/emails/digest-preview';

interface PendingDigest {
  week: string;
  weekStart?: string;
  created_at: string;
  approved: boolean;
  sent: boolean;
  sent_at?: string;
  summary: Record<string, string>;
  weeklyNumber: {
    value: string;
    label: Record<string, string>;
    source: Record<string, string>;
  };
  closingNote: Record<string, string>;
  commitmentCount: number;
  updatedTopics: string[];
}

/** Format the ISO week string, e.g. "2026-w07" */
function getISOWeekString(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.round(((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 6) / 7);
  return `${d.getFullYear()}-w${String(weekNum).padStart(2, '0')}`;
}

/** Format a date range like "10 — 16 février 2026" in the user's locale */
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
 * Prepare digest cron — triggered Sunday 21h CET.
 *
 * 1. Collects updated cards from all content types since Monday
 * 2. Builds pending-digest JSON
 * 3. Stores it via GitHub API
 * 4. Sends preview email to admin
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    return NextResponse.json({ error: 'ADMIN_EMAIL not configured' }, { status: 500 });
  }

  // 1. Calculate cutoff — ISO week Monday 00:00 UTC
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() - ((dayOfWeek + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  const cutoff = monday.toISOString().split('T')[0];

  // 2. Collect all updated content
  const { byLocale, updatedTopics, counts } = collectDigestUpdates(cutoff, siteUrl);
  const frUpdates = byLocale.fr || [];
  const totalFrUpdates = frUpdates.length;

  // 3. Auto-generate summary line per locale
  const summaryFr = generateSummaryLine(counts, 'fr');
  const summaryNl = generateSummaryLine(counts, 'nl');
  const summaryEn = generateSummaryLine(counts, 'en');
  const summaryDe = generateSummaryLine(counts, 'de');

  // 4. Read commitment count
  let commitmentCount = 0;
  try {
    const file = await readGitHubFile('data/commitments.json');
    if (file) {
      const data = JSON.parse(file.content);
      commitmentCount = data.commitments?.length || 0;
    }
  } catch {
    // Default to 0 if file can't be read
  }

  // 5. Auto-suggest weekly number from first updated domain's metrics
  let weeklyNumberValue = String(commitmentCount);
  let weeklyNumberLabelFr = 'Engagements chiffrés de la DPR';
  let weeklyNumberSourceFr = 'Brussels Governance Monitor';

  if (totalFrUpdates > 0) {
    const frCards = getDomainCards('fr');
    const firstUpdated = frCards.find(
      (c) => c.lastModified >= cutoff && c.metrics.length > 0,
    );
    if (firstUpdated && firstUpdated.metrics[0]) {
      const m = firstUpdated.metrics[0];
      weeklyNumberValue = `${m.value}${m.unit ? ` ${m.unit}` : ''}`;
      weeklyNumberLabelFr = m.label;
      weeklyNumberSourceFr = m.source;
    }
  }

  // 6. Build pending digest
  const week = getISOWeekString(now);

  const pendingDigest: PendingDigest = {
    week,
    weekStart: cutoff,
    created_at: now.toISOString(),
    approved: false,
    sent: false,
    summary: {
      fr: summaryFr,
      nl: summaryNl,
      en: summaryEn,
      de: summaryDe,
    },
    weeklyNumber: {
      value: weeklyNumberValue,
      label: {
        fr: weeklyNumberLabelFr,
        nl: weeklyNumberLabelFr, // Can be refined manually
        en: weeklyNumberLabelFr,
        de: weeklyNumberLabelFr,
      },
      source: {
        fr: weeklyNumberSourceFr,
        nl: weeklyNumberSourceFr,
        en: weeklyNumberSourceFr,
        de: weeklyNumberSourceFr,
      },
    },
    closingNote: {
      fr: 'Bonne semaine à tous.',
      nl: 'Een goede week gewenst.',
      en: 'Wishing you all a good week.',
      de: 'Allen eine gute Woche.',
    },
    commitmentCount,
    updatedTopics,
  };

  // 7. Write to GitHub — preserve user edits if same week
  const filePath = 'data/pending-digest.json';
  let existingSha: string | undefined;
  try {
    const existing = await readGitHubFile(filePath);
    if (existing) {
      existingSha = existing.sha;
      const prev = JSON.parse(existing.content);
      // If same week, not sent, preserve user-edited fields
      if (prev.week === week && !prev.sent) {
        pendingDigest.closingNote = prev.closingNote;
        pendingDigest.weeklyNumber = prev.weeklyNumber;
      }
    }
  } catch {
    // File doesn't exist yet, that's fine
  }

  await writeGitHubFile(
    filePath,
    JSON.stringify(pendingDigest, null, 2) + '\n',
    existingSha,
    `chore: prepare digest ${week}`,
  );

  // 8. Count active subscribers for the preview info
  let subscriberCount = 0;
  try {
    const contacts = await listActiveContacts();
    subscriberCount = contacts.length;
  } catch {
    // Non-blocking — just show 0
  }

  // 9. Generate approval token and send preview
  const token = generateDigestApprovalToken(week);
  // Approval now requires POST — redirect admin to the review page with the token
  const approveUrl = `${siteUrl}/fr/review/digest?approve_token=${encodeURIComponent(token)}`;
  const editUrl = `${siteUrl}/fr/review/digest`;
  const weekOf = formatWeekRange(now, 'fr');

  const previewUpdates = frUpdates.length > 0 ? frUpdates : [];
  const unsubToken = generateUnsubscribeToken(adminEmail);
  const unsubscribeUrl = `${siteUrl}/fr/subscribe/preferences?token=${encodeURIComponent(unsubToken)}`;

  const resend = getResend();
  await resendCall(() =>
    resend.emails.send({
      from: EMAIL_FROM,
      to: adminEmail,
      subject: `[PREVIEW] Digest ${week} — ${totalFrUpdates} mise${totalFrUpdates > 1 ? 's' : ''} à jour`,
      react: DigestPreviewEmail({
        locale: 'fr',
        updates: previewUpdates,
        weekOf,
        unsubscribeUrl,
        summaryLine: summaryFr,
        weeklyNumber: {
          value: weeklyNumberValue,
          label: weeklyNumberLabelFr,
          source: weeklyNumberSourceFr,
        },
        closingNote: pendingDigest.closingNote.fr,
        commitmentCount,
        siteUrl,
        approveUrl,
        editUrl,
        subscriberCount,
      }),
      tags: [{ name: 'type', value: 'digest-preview' }],
    }),
  );

  return NextResponse.json({
    success: true,
    week,
    updatedTopics,
    counts,
    frUpdateCount: totalFrUpdates,
    subscriberCount,
    commitmentCount,
  });
}
