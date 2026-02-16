import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { readGitHubFile } from '@/lib/github';
import { getDomainCards } from '@/lib/content';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { generateUnsubscribeToken } from '@/lib/token';
import DigestEmail from '@/emails/digest';
import type { DigestUpdate } from '@/emails/digest';
import type { Locale } from '@/i18n/routing';

const SUPPORTED_LOCALES: Locale[] = ['fr', 'nl', 'en', 'de'];

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

  // Collect updated cards
  const createdAt = new Date(digest.created_at);
  const sevenDaysAgo = new Date(createdAt);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split('T')[0];

  const cards = getDomainCards(locale as Locale);
  const updates: DigestUpdate[] = cards
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

  const weekOf = formatWeekRange(createdAt, locale);
  const unsubToken = generateUnsubscribeToken(adminEmail);
  const unsubscribeUrl = `${siteUrl}/${locale}/subscribe/preferences?token=${encodeURIComponent(unsubToken)}`;

  const resend = getResend();
  const { error } = await resendCall(() =>
    resend.emails.send({
      from: EMAIL_FROM,
      to: adminEmail,
      subject: `[TEST] Digest ${digest.week} — ${updates.length} domaine${updates.length > 1 ? 's' : ''}`,
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
      tags: [{ name: 'type', value: 'digest-test' }],
    }),
  );

  if (error) {
    return NextResponse.json({ error: 'Failed to send test email', detail: JSON.stringify(error) }, { status: 500 });
  }

  return NextResponse.json({ success: true, sentTo: adminEmail });
});
