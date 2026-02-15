import { NextResponse } from 'next/server';
import { getDomainCards } from '@/lib/content';
import { readGitHubFile, writeGitHubFile } from '@/lib/github';
import { getResend, EMAIL_FROM, listActiveContacts, resendCall } from '@/lib/resend';
import { generateDigestApprovalToken, generateUnsubscribeToken } from '@/lib/token';
import DigestPreviewEmail from '@/emails/digest-preview';
import type { Locale } from '@/i18n/routing';
import type { DigestUpdate } from '@/emails/digest';

const SUPPORTED_LOCALES: Locale[] = ['fr', 'nl', 'en', 'de'];

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
 * 1. Collects updated domain cards from the past 7 days
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

  // 1. Calculate 7-day cutoff
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split('T')[0];

  // 2. Collect updated domain cards per locale
  const updatedCardsByLocale: Record<string, DigestUpdate[]> = {};
  const updatedDomainSlugs = new Set<string>();

  for (const locale of SUPPORTED_LOCALES) {
    const cards = getDomainCards(locale);
    updatedCardsByLocale[locale] = cards
      .filter((c) => c.lastModified >= cutoff)
      .map((c) => {
        updatedDomainSlugs.add(c.domain);
        return {
          title: c.title,
          domain: c.domain,
          status: c.status,
          summary: c.changeSummary || c.summary,
          url: `${siteUrl}/${locale}/domains/${c.slug}`,
        };
      });
  }

  const updatedDomains = [...updatedDomainSlugs];
  const frUpdates = updatedCardsByLocale.fr || [];

  // 3. Auto-generate summary line
  const statusChanges = frUpdates.filter((u) => u.status !== 'ongoing').length;
  const summaryFr =
    frUpdates.length === 0
      ? 'Aucune mise à jour cette semaine.'
      : `${frUpdates.length} domaine${frUpdates.length > 1 ? 's' : ''} mis à jour${statusChanges > 0 ? `, ${statusChanges} changement${statusChanges > 1 ? 's' : ''} de statut` : ''}`;

  const summaryNl =
    frUpdates.length === 0
      ? 'Geen updates deze week.'
      : `${frUpdates.length} domein${frUpdates.length > 1 ? 'en' : ''} bijgewerkt${statusChanges > 0 ? `, ${statusChanges} statuswijziging${statusChanges > 1 ? 'en' : ''}` : ''}`;

  const summaryEn =
    frUpdates.length === 0
      ? 'No updates this week.'
      : `${frUpdates.length} domain${frUpdates.length > 1 ? 's' : ''} updated${statusChanges > 0 ? `, ${statusChanges} status change${statusChanges > 1 ? 's' : ''}` : ''}`;

  const summaryDe =
    frUpdates.length === 0
      ? 'Keine Aktualisierungen diese Woche.'
      : `${frUpdates.length} Bereich${frUpdates.length > 1 ? 'e' : ''} aktualisiert${statusChanges > 0 ? `, ${statusChanges} Statusänderung${statusChanges > 1 ? 'en' : ''}` : ''}`;

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

  if (frUpdates.length > 0) {
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
      fr: 'Bonne semaine à tous. — Zoltan',
      nl: 'Een goede week gewenst. — Zoltan',
      en: 'Wishing you all a good week. — Zoltan',
      de: 'Allen eine gute Woche. — Zoltan',
    },
    commitmentCount,
    updatedDomains,
  };

  // 7. Write to GitHub
  const filePath = 'data/pending-digest.json';
  let existingSha: string | undefined;
  try {
    const existing = await readGitHubFile(filePath);
    if (existing) existingSha = existing.sha;
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
  const approveUrl = `${siteUrl}/api/digest/approve?token=${encodeURIComponent(token)}`;
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
      subject: `[PREVIEW] Digest ${week} — ${frUpdates.length} domaine${frUpdates.length > 1 ? 's' : ''}`,
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
    updatedDomains,
    frUpdateCount: frUpdates.length,
    subscriberCount,
    commitmentCount,
  });
}
