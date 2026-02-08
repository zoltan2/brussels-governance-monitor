import { NextResponse } from 'next/server';
import { getDomainCards } from '@/lib/content';
import type { Locale } from '@/i18n/routing';

/**
 * Weekly digest cron endpoint.
 * Called by Vercel Cron every Monday at 08:00 CET.
 *
 * In production, this will:
 * 1. Fetch subscribers from Resend audiences
 * 2. Check which domain cards were updated in the past 7 days
 * 3. Send personalized digests to each subscriber based on their topics
 *
 * For now, this endpoint returns the digest data structure
 * without actually sending emails (requires Resend Audiences setup).
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split('T')[0];

  const locales: Locale[] = ['fr', 'nl'];
  const digestData: Record<string, unknown[]> = {};

  for (const locale of locales) {
    const cards = getDomainCards(locale);
    const recentlyUpdated = cards.filter((c) => c.lastModified >= cutoff);

    digestData[locale] = recentlyUpdated.map((c) => ({
      title: c.title,
      domain: c.domain,
      status: c.status,
      summary: c.summary,
      lastModified: c.lastModified,
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels'}/${locale}/domains/${c.slug}`,
    }));
  }

  const weekOf = new Date().toLocaleDateString('fr-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return NextResponse.json({
    success: true,
    weekOf,
    cutoffDate: cutoff,
    updates: digestData,
    note: 'Digest data prepared. Email sending requires Resend Audiences configuration.',
  });
}
