import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { readGitHubFile, writeGitHubFile } from '@/lib/github';
import { getDomainCards } from '@/lib/content';
import { getResend, EMAIL_FROM, listActiveContacts, SECTOR_TO_DOMAIN, resendCall } from '@/lib/resend';
import { generateUnsubscribeToken } from '@/lib/token';
import DigestEmail from '@/emails/digest';
import type { DigestUpdate } from '@/emails/digest';
import type { Locale } from '@/i18n/routing';

const SUPPORTED_LOCALES: Locale[] = ['fr', 'nl', 'en', 'de'];
const BATCH_SIZE = 50;

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

function getNextMonday8CET(now: Date): Date {
  const target = new Date(now);
  const day = target.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  target.setUTCDate(target.getUTCDate() + daysUntilMonday);
  target.setUTCHours(7, 0, 0, 0);
  return target;
}

/**
 * POST /api/digest/approve-from-review
 * Auth-protected — approve and send the digest (same logic as /api/digest/approve
 * but uses session auth instead of token auth).
 */
export const POST = auth(async function POST(req) {
  if (!req.auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

  const filePath = 'data/pending-digest.json';
  const file = await readGitHubFile(filePath);
  if (!file) {
    return NextResponse.json({ error: 'No pending digest found' }, { status: 404 });
  }

  const digest = JSON.parse(file.content);

  if (digest.sent) {
    return NextResponse.json({ error: 'Digest already sent' }, { status: 409 });
  }

  digest.approved = true;

  const now = new Date();
  let scheduledAt: string | undefined;
  const nextMonday8CET = getNextMonday8CET(now);
  if (now < nextMonday8CET) {
    scheduledAt = nextMonday8CET.toISOString();
  }

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
        summary: (c.changeSummary && !c.changeSummary.toLowerCase().includes('domain card'))
          ? c.changeSummary
          : c.summary,
        url: `${siteUrl}/${locale}/domains/${c.slug}`,
      }));
  }

  const contacts = await listActiveContacts();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emailPayloads: any[] = [];
  let skipped = 0;

  for (const contact of contacts) {
    const locale = SUPPORTED_LOCALES.includes(contact.locale as Locale)
      ? (contact.locale as Locale)
      : 'fr';

    const allUpdates = updatedCardsByLocale[locale] || [];

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
        feedbackYesUrl: `${siteUrl}/digest/feedback?week=${digest.week}&vote=yes&lang=${locale}`,
        feedbackNoUrl: `${siteUrl}/digest/feedback?week=${digest.week}&vote=no&lang=${locale}`,
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

  digest.sent = true;
  digest.sent_at = now.toISOString();

  await writeGitHubFile(
    filePath,
    JSON.stringify(digest, null, 2) + '\n',
    file.sha,
    `chore: digest ${digest.week} approved via review and sent`,
  );

  return NextResponse.json({
    success: true,
    week: digest.week,
    sent,
    skipped,
    scheduledAt: scheduledAt || 'immediate',
    errors: errors.length > 0 ? errors : undefined,
  });
});
