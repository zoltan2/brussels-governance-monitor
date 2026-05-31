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

  // 5. Auto-suggest weekly number from first updated domain's metrics.
  //    Value = the bare figure (the value box is NOT translated); the descriptive
  //    text lives in the label/source, which ARE read per-locale from each
  //    localized card so the legend is properly translated out of the box.
  let weeklyNumberValue = String(commitmentCount);
  const weeklyNumberLabel: Record<string, string> = {
    fr: 'Engagements chiffrés de la DPR',
    nl: 'Becijferde beloften van het regeerakkoord',
    en: 'Quantified pledges from the DPR',
    de: 'Bezifferte Versprechen des Regierungsabkommens',
  };
  const weeklyNumberSource: Record<string, string> = {
    fr: 'Brussels Governance Monitor',
    nl: 'Brussels Governance Monitor',
    en: 'Brussels Governance Monitor',
    de: 'Brussels Governance Monitor',
  };

  if (totalFrUpdates > 0) {
    const frCards = getDomainCards('fr');
    const firstUpdated = frCards.find(
      (c) => c.lastModified >= cutoff && c.metrics.length > 0,
    );
    if (firstUpdated && firstUpdated.metrics[0]) {
      const idx = 0;
      const m = firstUpdated.metrics[idx];
      // Bare figure only: append the unit to the value solely when it is a short
      // symbol (%, M€, €, /an…). A descriptive unit stays out of the big number.
      const unit = (m.unit ?? '').trim();
      const isShortUnit = unit.length > 0 && unit.length <= 5;
      weeklyNumberValue = isShortUnit ? `${m.value} ${unit}` : String(m.value);
      for (const loc of ['fr', 'nl', 'en', 'de'] as const) {
        const card = loc === 'fr' ? firstUpdated : getDomainCards(loc).find((c) => c.slug === firstUpdated.slug);
        const lm = card?.metrics[idx];
        weeklyNumberLabel[loc] = lm?.label ?? m.label;
        weeklyNumberSource[loc] = lm?.source ?? lm?.proofSources?.[0]?.label ?? m.source ?? m.proofSources[0]?.label ?? '';
      }
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
      label: { ...weeklyNumberLabel },
      source: { ...weeklyNumberSource },
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
          label: weeklyNumberLabel.fr,
          source: weeklyNumberSource.fr,
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
