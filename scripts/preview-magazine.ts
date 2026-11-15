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

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { parseDigestMagazine } from '../src/lib/magazine/parse';
import { validateMagazine } from '../src/lib/magazine/validate';
import { checkSourcesAgainstCards } from '../src/lib/magazine/sources-check';
import { renderMagazine } from '../src/lib/magazine/render';
import { checkParity } from '../src/lib/magazine/parity';
import { MAGAZINE_LOCALES, SOURCE_LOCALE, isMagazineLocale, type MagazineLocale } from '../src/lib/magazine/locales';

const DIGEST_DIR = resolve(process.cwd(), 'content/digest');
const PREVIEW_DIR = resolve(process.cwd(), '.preview');
// `-- 2026-w47 --lang nl` : aperçu d'une édition traduite, dans .preview/magazine-nl.html.
const langAt = process.argv.indexOf('--lang');
const langArg = langAt > -1 ? process.argv[langAt + 1] ?? '' : SOURCE_LOCALE;
if (!isMagazineLocale(langArg)) throw new Error(`--lang ${langArg} : éditions connues ${MAGAZINE_LOCALES.join(', ')}`);
const LOCALE: MagazineLocale = langArg;
const WANTED = process.argv.slice(2).find((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--lang');
const PREVIEW_FILE = join(PREVIEW_DIR, LOCALE === SOURCE_LOCALE ? 'magazine.html' : `magazine-${LOCALE}.html`);

// `npm run magazine:preview -- 2026-w39` relit un numéro précis ; sans argument,
// le digest français le plus récent.
function findLatestFrDigest(): string {
  const wanted = WANTED;
  if (wanted) {
    const path = join(DIGEST_DIR, `${wanted}.fr.mdx`);
    if (!existsSync(path)) throw new Error(`No digest ${wanted}.fr.mdx in content/digest/`);
    return path;
  }
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

  // Édition traduite : même semaine, autre langue, comparée au français.
  let shown = draft;
  const errors = [
    ...validateMagazine(draft.magazine),
    ...checkSourcesAgainstCards(draft.magazine, process.cwd()),
  ];
  if (LOCALE !== SOURCE_LOCALE) {
    const path = digestPath.replace(/\.fr\.mdx$/, `.${LOCALE}.mdx`);
    if (!existsSync(path)) throw new Error(`No digest ${path}`);
    shown = parseDigestMagazine(readFileSync(path, 'utf-8'));
    if (!shown.magazine) {
      console.error(`[magazine] ERROR: No \`magazine:\` frontmatter block in ${path}.`);
      process.exit(1);
    }
    errors.length = 0;
    errors.push(
      ...validateMagazine(shown.magazine),
      ...checkSourcesAgainstCards(shown.magazine, process.cwd()),
      ...checkParity(draft.magazine, shown.magazine, LOCALE),
    );
  }
  if (errors.length > 0) {
    console.warn('[magazine] Validation warnings (preview will still render):');
    for (const e of errors) {
      console.warn(`  - item ${e.itemIndex ?? 'n/a'}, field "${e.field}": ${e.reason}`);
    }
  }

  const html = renderMagazine(shown, { locale: LOCALE });
  mkdirSync(PREVIEW_DIR, { recursive: true });
  writeFileSync(PREVIEW_FILE, html, 'utf-8');

  console.log(
    `[magazine] Preview for ${shown.weekShort} ${LOCALE} (${shown.magazine!.items.length} items) → ${PREVIEW_FILE}`,
  );
  openInBrowser(PREVIEW_FILE);
}

main();
