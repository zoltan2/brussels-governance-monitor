import { NextResponse } from 'next/server';
import { getDomainCards } from '@/lib/content';
import { getResend, EMAIL_FROM, listActiveContacts } from '@/lib/resend';
import { generateUnsubscribeToken } from '@/lib/token';
import DigestEmail from '@/emails/digest';
import type { Locale } from '@/i18n/routing';

const SUPPORTED_DIGEST_LOCALES: Locale[] = ['fr', 'nl'];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Weekly digest cron endpoint.
 * Called by Vercel Cron every Monday at 08:00 CET.
 *
 * 1. Fetches active subscribers from Resend Contacts
 * 2. Checks which domain cards were updated in the past 7 days
 * 3. Sends personalized digests to each subscriber based on their topics
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

  for (const contact of contacts) {
    // Determine locale (fallback to fr if unsupported)
    const locale = SUPPORTED_DIGEST_LOCALES.includes(contact.locale as Locale)
      ? (contact.locale as 'fr' | 'nl')
      : 'fr';

    const allUpdates = updatedCardsByLocale[locale] || [];

    // Filter updates matching subscriber's topics
    // The "solutions" topic is ignored for domain card digests
    const subscriberDomainTopics = contact.topics.filter((t) => t !== 'solutions');
    const updates =
      subscriberDomainTopics.length > 0
        ? allUpdates.filter((u) => subscriberDomainTopics.includes(u.domain))
        : allUpdates;

    // Skip if no relevant updates
    if (updates.length === 0) {
      skipped++;
      continue;
    }

    const unsubToken = generateUnsubscribeToken(contact.email);
    const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}&locale=${locale}`;

    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: contact.email,
        subject:
          locale === 'nl'
            ? `Wekelijkse samenvatting — ${weekOf}`
            : `Digest hebdomadaire — ${weekOf}`,
        react: DigestEmail({ locale, updates, weekOf, unsubscribeUrl }),
        tags: [
          { name: 'type', value: 'digest' },
          { name: 'locale', value: locale },
        ],
      });
      sent++;
    } catch (err) {
      errors.push(`${contact.email}: ${String(err)}`);
    }

    // Rate limit: Resend allows 2 req/sec, use 500ms pause
    await sleep(500);
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
