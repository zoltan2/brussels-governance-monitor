import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { readGitHubFile, writeGitHubFile } from '@/lib/github';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
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
  status: 'changed' | 'unchanged' | 'new' | 'error';
  newHash?: string;
  error?: string;
}

interface HashEntry {
  hash: string;
  checkedAt: string;
}

const HASHES_PATH = 'data/watch-hashes.json';

/**
 * Daily watch cron endpoint.
 * Called by Vercel Cron every day at 7:00 CET.
 *
 * 1. Reads the source registry
 * 2. Loads previous hashes from data/watch-hashes.json (GitHub)
 * 3. Fetches each enabled source
 * 4. Compares content hash with previous run
 * 5. Persists updated hashes back to GitHub
 * 6. Sends a digest email if there are changes or pending drafts
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

  // Load previous hashes from GitHub
  let previousHashes: Record<string, HashEntry> = {};
  let hashesSha: string | undefined;
  try {
    const file = await readGitHubFile(HASHES_PATH);
    if (file) {
      previousHashes = JSON.parse(file.content);
      hashesSha = file.sha;
    }
  } catch {
    // First run or corrupted file — start fresh
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
  const updatedHashes: Record<string, HashEntry> = { ...previousHashes };
  const nowISO = today.toISOString();

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
      const prev = previousHashes[source.id];

      if (!prev) {
        // First time seeing this source
        results.push({
          id: source.id,
          name: source.name,
          url: source.url,
          type: source.type,
          status: 'new',
          newHash: hash,
        });
      } else if (prev.hash !== hash) {
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

      updatedHashes[source.id] = { hash, checkedAt: nowISO };
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

  // Persist updated hashes to GitHub
  try {
    await writeGitHubFile(
      HASHES_PATH,
      JSON.stringify(updatedHashes, null, 2) + '\n',
      hashesSha,
      `chore: watch hashes ${today.toISOString().split('T')[0]}`,
    );
  } catch (err) {
    console.error('Failed to persist watch hashes:', err);
  }

  const changed = results.filter((r) => r.status === 'changed');
  const newSources = results.filter((r) => r.status === 'new');
  const errors = results.filter((r) => r.status === 'error');
  const pendingDrafts = getDraftCards('fr');
  const isFirstRun = !hashesSha;

  // Send digest email if there's anything to report
  // On first run, skip "new" sources (all are new) — only report changes on subsequent runs
  const adminEmail = process.env.ADMIN_EMAIL;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

  const hasChanges = changed.length > 0;
  const shouldEmail = adminEmail && process.env.RESEND_API_KEY &&
    (hasChanges || pendingDrafts.length > 0 || errors.length > 0);

  if (shouldEmail) {
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
        isFirstRun ? `Nouvelles sources indexées : ${newSources.length}` : '',
        `Drafts en attente : ${pendingDrafts.length}`,
        '',
        changed.length > 0 ? `Sources modifiées :\n${changedList}` : '',
        pendingDrafts.length > 0 ? `\nDrafts à valider :\n${draftList}\n\nValider : ${siteUrl}/fr/review` : '',
        errorList,
      ].filter(Boolean).join('\n');

      await resendCall(() =>
        resend.emails.send({
          from: EMAIL_FROM,
          to: adminEmail,
          subject: `BGM Watch — ${changed.length} changement(s), ${pendingDrafts.length} draft(s) — ${dateStr}`,
          text: body,
          tags: [{ name: 'type', value: 'watch-digest' }],
        }),
      );
    } catch (emailErr) {
      console.error('Watch digest email error:', emailErr);
    }
  }

  return NextResponse.json({
    success: true,
    date: today.toISOString(),
    sourcesChecked: results.length,
    changed: changed.length,
    new: newSources.length,
    errors: errors.length,
    pendingDrafts: pendingDrafts.length,
    firstRun: isFirstRun,
    results,
  });
}
