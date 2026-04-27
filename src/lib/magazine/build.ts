import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseDigestMagazine } from './parse';
import { validateMagazine } from './validate';
import { renderMagazine } from './render';
import { renderIndexPage, type WeekMeta } from './index-page';
import type { MagazineDraft } from './types';

interface BuildOptions {
  root: string;
}

interface BuildResult {
  status: 'built' | 'skipped';
  weekShort?: string;
}

function findLatestFrDigest(root: string): string | null {
  const dir = join(root, 'content/digest');
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter(
    (f) => f.endsWith('.fr.mdx') && !f.startsWith('__'),
  );
  if (files.length === 0) return null;
  files.sort();
  return join(dir, files[files.length - 1]);
}


/**
 * Pull rich metadata for a published week by reading its FR digest. Falls back
 * gracefully when the digest no longer exists or cannot be parsed — the index
 * renderer accepts WeekMeta with only `weekShort` + `weekLabel` filled.
 */
function readWeekMeta(root: string, weekShort: string): WeekMeta {
  const weekLabel = weekShort.replace(/^s/, 'S');
  const weekNum = weekShort.replace(/^s/, '');
  const candidates = readdirSync(join(root, 'content/digest')).filter(
    (f) => f.endsWith('.fr.mdx') && f.includes(`-w${weekNum}.`),
  );
  if (candidates.length === 0) return { weekShort, weekLabel };
  try {
    const raw = readFileSync(join(root, 'content/digest', candidates[0]), 'utf-8');
    const draft = parseDigestMagazine(raw);
    const dateRange = extractDateRange(raw);
    return {
      weekShort,
      weekLabel,
      dateRange,
      tagline: draft.magazine?.tagline,
      itemCount: draft.magazine?.items.length,
    };
  } catch {
    return { weekShort, weekLabel };
  }
}

/**
 * Pull "20 — 26 avril 2026" out of a digest title like
 * `Digest BGM — Semaine 17 (20-26 avril 2026)`.
 */
function extractDateRange(raw: string): string | undefined {
  const titleMatch = raw.match(/^title:\s*"([^"]+)"/m);
  if (!titleMatch) return undefined;
  const inner = titleMatch[1].match(/\(([^)]+)\)/);
  if (!inner) return undefined;
  return inner[1].replace(/(\d)-(\d)/, '$1 — $2');
}

function collectWeeksWithMeta(root: string): WeekMeta[] {
  const dir = join(root, 'docs/magazine');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^s\d+$/.test(f))
    .sort()
    .reverse()
    .map((w) => readWeekMeta(root, w));
}

export function buildMagazine(opts: BuildOptions): BuildResult {
  const digestPath = findLatestFrDigest(opts.root);
  if (!digestPath) {
    console.log('[magazine] No FR digest found, skipping.');
    return { status: 'skipped' };
  }

  const raw = readFileSync(digestPath, 'utf-8');
  const draft: MagazineDraft = parseDigestMagazine(raw);

  if (!draft.magazine) {
    console.log(`[magazine] No magazine: block in ${digestPath}, skipping.`);
    return { status: 'skipped' };
  }

  const errors = validateMagazine(draft.magazine);
  if (errors.length > 0) {
    const msg = errors
      .map((e) => `  - item ${e.itemIndex ?? 'n/a'}, field "${e.field}": ${e.reason}`)
      .join('\n');
    throw new Error(`Magazine validation failed:\n${msg}`);
  }

  const html = renderMagazine(draft);
  const magDir = join(opts.root, 'docs/magazine');
  const latestDir = join(magDir, 'latest');
  const weekDir = join(magDir, draft.weekShort);
  mkdirSync(latestDir, { recursive: true });
  mkdirSync(weekDir, { recursive: true });
  writeFileSync(join(latestDir, 'index.html'), html, 'utf-8');
  writeFileSync(join(weekDir, 'index.html'), html, 'utf-8');

  const weeks = collectWeeksWithMeta(opts.root);
  if (!weeks.some((w) => w.weekShort === draft.weekShort)) {
    weeks.unshift(readWeekMeta(opts.root, draft.weekShort));
  }
  writeFileSync(join(magDir, 'index.html'), renderIndexPage(weeks, 'fr'), 'utf-8');

  console.log(`[magazine] Built ${draft.weekShort} — ${draft.magazine.items.length} items`);
  return { status: 'built', weekShort: draft.weekShort };
}
