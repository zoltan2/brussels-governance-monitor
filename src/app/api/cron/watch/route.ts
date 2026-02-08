import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getResend, EMAIL_FROM } from '@/lib/resend';
import { getDraftCards } from '@/lib/content';

interface SourceEntry {
  id: string;
  name: string;
  url: string;
  type: 'institutional' | 'press';
  category: string;
  cardsAffected: string[];
  frequency: 'daily' | 'weekly';
  enabled: boolean;
  notes: string;
}

interface WatchResult {
  id: string;
  name: string;
  url: string;
  type: string;
  status: 'changed' | 'unchanged' | 'error';
  newHash?: string;
  error?: string;
}

// In-memory store for content hashes (reset on cold start)
// In production, this would be stored in KV or a database
const contentHashes = new Map<string, string>();

/**
 * Daily watch cron endpoint.
 * Called by Vercel Cron every day at 7:00 CET.
 *
 * 1. Reads the source registry
 * 2. Fetches each enabled source
 * 3. Compares content hash with previous run
 * 4. Sends a digest email if there are changes or pending drafts
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Load source registry
  let sources: SourceEntry[];
  try {
    const registryModule = await import('../../../../../docs/source-registry.json');
    sources = registryModule.sources as SourceEntry[];
  } catch {
    return NextResponse.json({ error: 'Source registry not found' }, { status: 500 });
  }

  // Determine which sources to check based on frequency
  const today = new Date();
  const isMonday = today.getDay() === 1;
  const enabledSources = sources.filter((s) => {
    if (!s.enabled) return false;
    if (s.frequency === 'weekly' && !isMonday) return false;
    return true;
  });

  // Fetch each source and compare hashes
  const results: WatchResult[] = [];

  for (const source of enabledSources) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'BGM-Watch/1.0 (+https://governance.brussels)',
        },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        results.push({
          id: source.id,
          name: source.name,
          url: source.url,
          type: source.type,
          status: 'error',
          error: `HTTP ${res.status}`,
        });
        continue;
      }

      const body = await res.text();
      const hash = createHash('sha256').update(body).digest('hex').slice(0, 16);
      const previousHash = contentHashes.get(source.id);

      if (previousHash && previousHash !== hash) {
        results.push({
          id: source.id,
          name: source.name,
          url: source.url,
          type: source.type,
          status: 'changed',
          newHash: hash,
        });
      } else {
        results.push({
          id: source.id,
          name: source.name,
          url: source.url,
          type: source.type,
          status: 'unchanged',
        });
      }

      contentHashes.set(source.id, hash);
    } catch (err) {
      results.push({
        id: source.id,
        name: source.name,
        url: source.url,
        type: source.type,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    // Small delay between fetches to be respectful
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const changed = results.filter((r) => r.status === 'changed');
  const errors = results.filter((r) => r.status === 'error');
  const pendingDrafts = getDraftCards('fr');

  // Send digest email if there's anything to report
  const adminEmail = process.env.ADMIN_EMAIL;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

  if (adminEmail && process.env.RESEND_API_KEY && (changed.length > 0 || pendingDrafts.length > 0)) {
    try {
      const resend = getResend();
      const dateStr = today.toLocaleDateString('fr-BE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const changedList = changed
        .map((c) => `- ${c.name} (${c.type})\n  ${c.url}`)
        .join('\n');

      const draftList = pendingDrafts
        .map((d) => `- [${d.type}] ${d.title} (${d.locale})`)
        .join('\n');

      const errorList = errors.length > 0
        ? `\n\nErreurs de fetch (${errors.length}):\n${errors.map((e) => `- ${e.name}: ${e.error}`).join('\n')}`
        : '';

      const body = [
        `BGM Watch — ${dateStr}`,
        '',
        `Sources vérifiées : ${results.length}`,
        `Changements détectés : ${changed.length}`,
        `Drafts en attente : ${pendingDrafts.length}`,
        '',
        changed.length > 0 ? `Sources modifiées :\n${changedList}` : '',
        pendingDrafts.length > 0 ? `\nDrafts à valider :\n${draftList}\n\nValider : ${siteUrl}/fr/review` : '',
        errorList,
      ].filter(Boolean).join('\n');

      await resend.emails.send({
        from: EMAIL_FROM,
        to: adminEmail,
        subject: `BGM Watch — ${changed.length} changement(s), ${pendingDrafts.length} draft(s) — ${dateStr}`,
        text: body,
        tags: [{ name: 'type', value: 'watch-digest' }],
      });
    } catch (emailErr) {
      console.error('Watch digest email error:', emailErr);
    }
  }

  return NextResponse.json({
    success: true,
    date: today.toISOString(),
    sourcesChecked: results.length,
    changed: changed.length,
    errors: errors.length,
    pendingDrafts: pendingDrafts.length,
    results,
  });
}
