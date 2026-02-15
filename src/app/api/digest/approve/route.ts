import { NextResponse } from 'next/server';
import { readGitHubFile, writeGitHubFile } from '@/lib/github';
import { getDomainCards } from '@/lib/content';
import { getResend, EMAIL_FROM, listActiveContacts, SECTOR_TO_DOMAIN, resendCall } from '@/lib/resend';
import { verifyDigestApprovalToken, generateUnsubscribeToken } from '@/lib/token';
import DigestEmail from '@/emails/digest';
import type { DigestUpdate } from '@/emails/digest';
import type { Locale } from '@/i18n/routing';

const SUPPORTED_LOCALES: Locale[] = ['fr', 'nl', 'en', 'de'];
const BATCH_SIZE = 50;

interface PendingDigest {
  week: string;
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
  updatedDomains: string[];
}

/** Format a date range for the locale */
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
 * Digest approval endpoint.
 * GET /api/digest/approve?token=xxx
 *
 * Verifies token, marks approved, sends batch emails with scheduledAt if before Monday 8h CET.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  // 1. Verify token
  const payload = verifyDigestApprovalToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

  // 2. Read pending digest
  const filePath = 'data/pending-digest.json';
  const file = await readGitHubFile(filePath);
  if (!file) {
    return NextResponse.json({ error: 'No pending digest found' }, { status: 404 });
  }

  const digest: PendingDigest = JSON.parse(file.content);

  // 3. Guard: prevent double-approval or double-send
  if (digest.sent) {
    return NextResponse.json({ error: 'Digest already sent', week: digest.week }, { status: 409 });
  }

  if (digest.week !== payload.week) {
    return NextResponse.json(
      { error: 'Token week mismatch', tokenWeek: payload.week, digestWeek: digest.week },
      { status: 400 },
    );
  }

  // 4. Mark approved
  digest.approved = true;

  // 5. Determine scheduledAt — next Monday 8h CET if before that
  const now = new Date();
  let scheduledAt: string | undefined;

  const nextMonday8CET = getNextMonday8CET(now);
  if (now < nextMonday8CET) {
    scheduledAt = nextMonday8CET.toISOString();
  }
  // If after Monday 8h CET, send immediately (no scheduledAt)

  // 6. Calculate cutoff and collect updates (same as prepare-digest)
  const createdAt = new Date(digest.created_at);
  const sevenDaysAgo = new Date(createdAt);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split('T')[0];

  const updatedCardsByLocale: Record<string, DigestUpdate[]> = {};
  for (const locale of SUPPORTED_LOCALES) {
    const cards = getDomainCards(locale);
    updatedCardsByLocale[locale] = cards
      .filter((c) => c.lastModified >= cutoff)
      .map((c) => ({
        title: c.title,
        domain: c.domain,
        status: c.status,
        summary: c.changeSummary || c.summary,
        url: `${siteUrl}/${locale}/domains/${c.slug}`,
      }));
  }

  // 7. Fetch active contacts
  const contacts = await listActiveContacts();

  // 8. Build email payloads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emailPayloads: any[] = [];
  let skipped = 0;

  for (const contact of contacts) {
    const locale = SUPPORTED_LOCALES.includes(contact.locale as Locale)
      ? (contact.locale as Locale)
      : 'fr';

    const allUpdates = updatedCardsByLocale[locale] || [];

    // Filter by subscriber's topics
    const subscriberDomainTopics = new Set<string>();
    for (const t of contact.topics) {
      if (t === 'solutions') continue;
      subscriberDomainTopics.add(t);
      const parent = SECTOR_TO_DOMAIN[t];
      if (parent) subscriberDomainTopics.add(parent);
    }

    const updates =
      subscriberDomainTopics.size > 0
        ? allUpdates.filter((u) => subscriberDomainTopics.has(u.domain))
        : allUpdates;

    // Business rule: no email if no matching updates
    if (updates.length === 0) {
      skipped++;
      continue;
    }

    const weekOf = formatWeekRange(createdAt, locale);
    const unsubToken = generateUnsubscribeToken(contact.email);
    const unsubscribeUrl = `${siteUrl}/${locale}/subscribe/preferences?token=${encodeURIComponent(unsubToken)}`;

    const subjectMap: Record<string, string> = {
      fr: `Digest hebdomadaire — ${weekOf}`,
      nl: `Wekelijkse samenvatting — ${weekOf}`,
      en: `Weekly digest — ${weekOf}`,
      de: `Wöchentliche Zusammenfassung — ${weekOf}`,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      from: EMAIL_FROM,
      to: contact.email,
      subject: subjectMap[locale] || subjectMap.fr,
      react: DigestEmail({
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
      }),
      tags: [
        { name: 'type', value: 'digest' },
        { name: 'locale', value: locale },
        { name: 'week', value: digest.week },
      ],
    };

    if (scheduledAt) {
      payload.scheduledAt = scheduledAt;
    }

    emailPayloads.push(payload);
  }

  // 9. Send in batches
  const resend = getResend();
  let sent = 0;
  const errors: string[] = [];

  for (let i = 0; i < emailPayloads.length; i += BATCH_SIZE) {
    const batch = emailPayloads.slice(i, i + BATCH_SIZE);
    try {
      const { error } = await resendCall(() => resend.batch.send(batch));
      if (error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE)}: ${JSON.stringify(error)}`);
      } else {
        sent += batch.length;
      }
    } catch (err) {
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE)}: ${String(err)}`);
    }
  }

  // 10. Mark sent
  digest.sent = true;
  digest.sent_at = now.toISOString();

  await writeGitHubFile(
    filePath,
    JSON.stringify(digest, null, 2) + '\n',
    file.sha,
    `chore: digest ${digest.week} approved and sent`,
  );

  // 11. Return success (or redirect to confirmation page)
  return NextResponse.json({
    success: true,
    week: digest.week,
    sent,
    skipped,
    scheduledAt: scheduledAt || 'immediate',
    errors: errors.length > 0 ? errors : undefined,
  });
}

/** Calculate next Monday at 08:00 CET (UTC+1, or UTC+2 in summer). */
function getNextMonday8CET(now: Date): Date {
  // CET is UTC+1 (standard), CEST is UTC+2 (summer)
  // For simplicity, use fixed UTC+1 offset — close enough for scheduling
  const target = new Date(now);
  const day = target.getUTCDay();

  // Calculate days until next Monday (1)
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  target.setUTCDate(target.getUTCDate() + daysUntilMonday);
  target.setUTCHours(7, 0, 0, 0); // 8h CET = 7h UTC

  return target;
}
