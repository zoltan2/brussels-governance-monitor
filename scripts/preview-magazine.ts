#!/usr/bin/env tsx
/**
 * preview-magazine.ts
 *
 * Reads the latest `content/digest/YYYY-wNN.fr.mdx`, extracts its `magazine:`
 * frontmatter block, and writes a preview HTML to `.preview/magazine.html`.
 * Opens the file in the default browser.
 *
 * Usage: npm run magazine:preview  (or `run magazine` via the zsh shortcut)
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { parseDigestMagazine } from '../src/lib/magazine/parse';
import { validateMagazine } from '../src/lib/magazine/validate';
import { renderMagazine } from '../src/lib/magazine/render';

const DIGEST_DIR = resolve(process.cwd(), 'content/digest');
const PREVIEW_DIR = resolve(process.cwd(), '.preview');
const PREVIEW_FILE = join(PREVIEW_DIR, 'magazine.html');

function findLatestFrDigest(): string {
  const files = readdirSync(DIGEST_DIR).filter(
    (f) => f.endsWith('.fr.mdx') && !f.startsWith('__'),
  );
  if (files.length === 0) throw new Error('No FR digest found in content/digest/');
  files.sort();
  return join(DIGEST_DIR, files[files.length - 1]);
}

function openInBrowser(filePath: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(cmd, [filePath], { detached: true, stdio: 'ignore' }).unref();
}

function main(): void {
  const digestPath = findLatestFrDigest();
  console.log(`[magazine] Reading ${digestPath}`);

  const raw = readFileSync(digestPath, 'utf-8');
  const draft = parseDigestMagazine(raw);

  if (!draft.magazine) {
    console.error(
      `[magazine] ERROR: No \`magazine:\` frontmatter block in ${digestPath}.\n` +
        '           Add a magazine: block to enable preview.',
    );
    process.exit(1);
  }

  const errors = validateMagazine(draft.magazine);
  if (errors.length > 0) {
    console.warn('[magazine] Validation warnings (preview will still render):');
    for (const e of errors) {
      console.warn(`  - item ${e.itemIndex ?? 'n/a'}, field "${e.field}": ${e.reason}`);
    }
  }

  const html = renderMagazine(draft);
  mkdirSync(PREVIEW_DIR, { recursive: true });
  writeFileSync(PREVIEW_FILE, html, 'utf-8');

  console.log(
    `[magazine] Preview for ${draft.weekShort} (${draft.magazine.items.length} items) → ${PREVIEW_FILE}`,
  );
  openInBrowser(PREVIEW_FILE);
}

main();
