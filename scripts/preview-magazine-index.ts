#!/usr/bin/env tsx
/**
 * preview-magazine-index.ts
 *
 * Renders the magazine.governance.brussels root index page locally, pulling
 * week metadata from `content/digest/*.fr.mdx`. Output goes to
 * `.preview/magazine-index.html`. Use to iterate on the landing-page design
 * without running a full build.
 *
 * Usage: npm run magazine:preview-index
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { parseDigestMagazine } from '../src/lib/magazine/parse';
import { renderIndexPage, type WeekMeta } from '../src/lib/magazine/index-page';

const ROOT = process.cwd();
const DIGEST_DIR = resolve(ROOT, 'content/digest');
const PREVIEW_DIR = resolve(ROOT, '.preview');
const PREVIEW_FILE = join(PREVIEW_DIR, 'magazine-index.html');

function extractDateRange(raw: string): string | undefined {
  const titleMatch = raw.match(/^title:\s*"([^"]+)"/m);
  if (!titleMatch) return undefined;
  const inner = titleMatch[1].match(/\(([^)]+)\)/);
  if (!inner) return undefined;
  return inner[1].replace(/(\d)-(\d)/, '$1 — $2');
}

function collectWeeks(): WeekMeta[] {
  const files = readdirSync(DIGEST_DIR).filter(
    (f) => f.endsWith('.fr.mdx') && !f.startsWith('__'),
  );
  const weeks: WeekMeta[] = [];
  for (const file of files) {
    const raw = readFileSync(join(DIGEST_DIR, file), 'utf-8');
    const draft = parseDigestMagazine(raw);
    if (!draft.magazine) continue;
    const weekShort = draft.weekShort;
    weeks.push({
      weekShort,
      weekLabel: weekShort.replace(/^s/, 'S'),
      dateRange: extractDateRange(raw),
      tagline: draft.magazine.tagline,
      itemCount: draft.magazine.items.length,
    });
  }
  return weeks.sort((a, b) => b.weekShort.localeCompare(a.weekShort));
}

function openInBrowser(filePath: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(cmd, [filePath], { detached: true, stdio: 'ignore' }).unref();
}

function main(): void {
  const weeks = collectWeeks();
  console.log(
    `[magazine-index] Rendering ${weeks.length} week(s): ${weeks.map((w) => w.weekShort).join(', ') || '(none)'}`,
  );
  const html = renderIndexPage(weeks, 'fr');
  mkdirSync(PREVIEW_DIR, { recursive: true });
  writeFileSync(PREVIEW_FILE, html, 'utf-8');
  console.log(`[magazine-index] Preview → ${PREVIEW_FILE}`);
  openInBrowser(PREVIEW_FILE);
}

main();
