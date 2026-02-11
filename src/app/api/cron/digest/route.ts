import { NextResponse } from 'next/server';
import { getDomainCards } from '@/lib/content';
import { getResend, EMAIL_FROM, listActiveContacts, SECTOR_TO_DOMAIN, resendCall } from '@/lib/resend';
import { generateUnsubscribeToken } from '@/lib/token';
import DigestEmail from '@/emails/digest';
import type { Locale } from '@/i18n/routing';

const SUPPORTED_DIGEST_LOCALES: Locale[] = ['fr', 'nl', 'en', 'de'];
const BATCH_SIZE = 50; // Resend allows 100, use 50 for safety

/**
 * Weekly digest cron endpoint.
 * Called by Vercel Cron every Monday at 08:00 CET.
 *
 * 1. Fetches active subscribers from Resend Contacts
 * 2. Checks which domain cards were updated in the past 7 days
 * 3. Sends personalized digests via Resend Batch API
 */
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

  // Calculate 7-day cutoff
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split('T')[0];

  // Pre-compute updated domain cards per locale
  const updatedCardsByLocale: Record<string, Array<{
    title: string;
    domain: string;
    status: string;
    summary: string;
    url: string;
  }>> = {};

  for (const locale of SUPPORTED_DIGEST_LOCALES) {
    const cards = getDomainCards(locale);
    updatedCardsByLocale[locale] = cards
      .filter((c) => c.lastModified >= cutoff)
      .map((c) => ({
        title: c.title,
        domain: c.domain,
        status: c.status,
        summary: c.summary,
        url: `${siteUrl}/${locale}/domains/${c.slug}`,
      }));
  }

  const weekOf = new Date().toLocaleDateString('fr-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Fetch all active subscribers
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

  // Build individual email payloads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emailPayloads: any[] = [];

  for (const contact of contacts) {
    const locale = SUPPORTED_DIGEST_LOCALES.includes(contact.locale as Locale)
      ? (contact.locale as Locale)
      : 'fr';

    const allUpdates = updatedCardsByLocale[locale] || [];

    // Filter updates matching subscriber's topics
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

    const unsubToken = generateUnsubscribeToken(contact.email);
    const unsubscribeUrl = `${siteUrl}/${locale}/subscribe/preferences?token=${encodeURIComponent(unsubToken)}`;

    emailPayloads.push({
      from: EMAIL_FROM,
      to: contact.email,
      subject: {
        fr: `Digest hebdomadaire — ${weekOf}`,
        nl: `Wekelijkse samenvatting — ${weekOf}`,
        en: `Weekly digest — ${weekOf}`,
        de: `Wöchentliche Zusammenfassung — ${weekOf}`,
      }[locale] || `Digest hebdomadaire — ${weekOf}`,
      react: DigestEmail({ locale, updates, weekOf, unsubscribeUrl }),
      tags: [
        { name: 'type', value: 'digest' },
        { name: 'locale', value: locale },
      ],
    });
  }

  // Send in batches using Resend Batch API
  for (let i = 0; i < emailPayloads.length; i += BATCH_SIZE) {
    const batch = emailPayloads.slice(i, i + BATCH_SIZE);
    try {
      const { error } = await resendCall(() =>
        resend.batch.send(batch),
      );
      if (error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE)}: ${JSON.stringify(error)}`);
      } else {
        sent += batch.length;
      }
    } catch (err) {
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE)}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    success: true,
    weekOf,
    cutoffDate: cutoff,
    totalContacts: contacts.length,
    sent,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  });
}
