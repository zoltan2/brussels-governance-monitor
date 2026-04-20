import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseDigestMagazine } from './parse';
import { validateMagazine } from './validate';
import { renderMagazine } from './render';
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

function collectAllPublishedWeeks(root: string): string[] {
  const dir = join(root, 'docs/magazine');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^s\d+$/.test(f))
    .sort()
    .reverse();
}

function renderIndex(weeks: string[]): string {
  const items = weeks
    .map((w) => `  <li><a href="./${w}/">Digest ${w.toUpperCase()}</a></li>`)
    .join('\n');
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><title>BGM — Archives magazine</title>
<style>body{font-family:system-ui;max-width:640px;margin:4rem auto;padding:0 1rem;color:#1a1a1a}h1{font-weight:900}a{color:#1a1a1a;text-decoration:none;border-bottom:1px solid #ccc}a:hover{border-bottom-color:#1a1a1a}li{margin:.6rem 0;list-style:none}</style>
</head><body>
<h1>BGM — Magazine</h1>
<p>Archives hebdomadaires. Dernier numéro : <a href="./latest/">latest</a></p>
<ul>
${items}
</ul>
</body></html>`;
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

  const weeks = collectAllPublishedWeeks(opts.root);
  if (!weeks.includes(draft.weekShort)) weeks.unshift(draft.weekShort);
  writeFileSync(join(magDir, 'index.html'), renderIndex(weeks), 'utf-8');

  console.log(`[magazine] Built ${draft.weekShort} — ${draft.magazine.items.length} items`);
  return { status: 'built', weekShort: draft.weekShort };
}
