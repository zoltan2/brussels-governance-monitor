import { NextResponse } from 'next/server';
import { getDomainCards } from '@/lib/content';
import { readGitHubFile, writeGitHubFile } from '@/lib/github';
import { getResend, EMAIL_FROM, listActiveContacts, SECTOR_TO_DOMAIN, resendCall } from '@/lib/resend';
import { generateUnsubscribeToken } from '@/lib/token';
import DigestEmail from '@/emails/digest';
import type { DigestUpdate } from '@/emails/digest';
import type { Locale } from '@/i18n/routing';

const SUPPORTED_DIGEST_LOCALES: Locale[] = ['fr', 'nl', 'en', 'de'];
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

/**
 * Weekly digest cron — Monday 08:00 CET (safety net).
 *
 * New behavior (v2):
 * - If pending-digest.json exists with approved=true and sent=true → nothing to do
 * - If approved=true and sent=false → send now (scheduledAt may have failed)
 * - If approved=false → do not send, log "Digest not approved"
 * - If no pending-digest.json → nothing to do
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY is required' }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

  // 1. Check pending digest
  let file;
  try {
    file = await readGitHubFile('data/pending-digest.json');
  } catch {
    return NextResponse.json({
      success: true,
      action: 'none',
      reason: 'Could not read pending-digest.json',
    });
  }

  if (!file) {
    return NextResponse.json({
      success: true,
      action: 'none',
      reason: 'No pending-digest.json found',
    });
  }

  const digest = JSON.parse(file.content);

  // Already sent — nothing to do
  if (digest.sent) {
    return NextResponse.json({
      success: true,
      action: 'none',
      reason: 'Digest already sent',
      week: digest.week,
    });
  }

  // Not approved — do not send
  if (!digest.approved) {
    console.log(`Digest ${digest.week} not approved, skipping safety-net send`);
    return NextResponse.json({
      success: true,
      action: 'none',
      reason: 'Digest not approved',
      week: digest.week,
    });
  }

  // Approved but not sent — send now (safety net)
  console.log(`Safety-net send for digest ${digest.week} (approved but not sent)`);

  const createdAt = new Date(digest.created_at);
  const sevenDaysAgo = new Date(createdAt);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split('T')[0];

  const updatedCardsByLocale: Record<string, DigestUpdate[]> = {};
  for (const locale of SUPPORTED_DIGEST_LOCALES) {
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

  let contacts;
  try {
    contacts = await listActiveContacts();
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch contacts', detail: String(err) },
      { status: 500 },
    );
  }

  const resend = getResend();
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emailPayloads: any[] = [];

  for (const contact of contacts) {
    const locale = SUPPORTED_DIGEST_LOCALES.includes(contact.locale as Locale)
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

    emailPayloads.push({
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
    });
  }

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

  // Mark as sent
  digest.sent = true;
  digest.sent_at = new Date().toISOString();

  try {
    await writeGitHubFile(
      'data/pending-digest.json',
      JSON.stringify(digest, null, 2) + '\n',
      file.sha,
      `chore: digest ${digest.week} sent via safety-net cron`,
    );
  } catch (err) {
    errors.push(`GitHub update failed: ${String(err)}`);
  }

  return NextResponse.json({
    success: true,
    action: 'safety-net-send',
    week: digest.week,
    sent,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  });
}
