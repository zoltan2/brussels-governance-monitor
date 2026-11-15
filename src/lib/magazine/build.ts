import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseDigestMagazine } from './parse';
import { validateMagazine } from './validate';
import { checkSourcesAgainstCards } from './sources-check';
import { renderMagazine } from './render';
import { renderIndexPage, type WeekMeta } from './index-page';
import { checkParity } from './parity';
import { MAGAZINE_LOCALES, SOURCE_LOCALE, editionPrefix, type MagazineLocale } from './locales';
import type { MagazineDraft, ValidationError } from './types';

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

// `docs/magazine/` is gitignored and only contains the week being built right
// now on a fresh CI checkout. Source of truth for "what has been published" is
// `content/digest/*.fr.mdx` with a `magazine:` block — gh-pages keeps the old
// directories alive via `keep_files: true`.
function collectWeeksWithMeta(root: string, locale: MagazineLocale = SOURCE_LOCALE): WeekMeta[] {
  const dir = join(root, 'content/digest');
  if (!existsSync(dir)) return [];
  const weeks: WeekMeta[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(`.${locale}.mdx`) || file.startsWith('__')) continue;
    try {
      const raw = readFileSync(join(dir, file), 'utf-8');
      const draft = parseDigestMagazine(raw);
      if (!draft.magazine || !draft.weekShort) continue;
      weeks.push({
        weekShort: draft.weekShort,
        weekLabel: draft.weekShort.replace(/^s/, 'S'),
        dateRange: extractDateRange(raw),
        tagline: draft.magazine.tagline,
        itemCount: draft.magazine.items.length,
      });
    } catch {
      // skip unparseable digest
    }
  }
  weeks.sort((a, b) =>
    b.weekShort.localeCompare(a.weekShort, 'en', { numeric: true }),
  );
  return weeks;
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

  const fail = (errors: ValidationError[]) => {
    const msg = errors
      .map((e) => `  - item ${e.itemIndex ?? 'n/a'}, field "${e.field}": ${e.reason}`)
      .join('\n');
    throw new Error(`Magazine validation failed:\n${msg}`);
  };

  // Gabarit v2 : chaque source citée doit être dans la fiche que le sujet désigne.
  const errors = [...validateMagazine(draft.magazine), ...checkSourcesAgainstCards(draft.magazine, opts.root)];
  if (errors.length > 0) fail(errors);

  // Éditions traduites : même semaine, même nom de fichier, autre langue. Une
  // édition sans bloc est sautée, le français sort quand même ; une édition
  // qui s'écarte du français fait échouer le build (garde de parité).
  const drafts: { locale: MagazineLocale; draft: MagazineDraft }[] = [{ locale: SOURCE_LOCALE, draft }];
  for (const locale of MAGAZINE_LOCALES) {
    if (locale === SOURCE_LOCALE) continue;
    const path = digestPath.replace(/\.fr\.mdx$/, `.${locale}.mdx`);
    if (!existsSync(path)) {
      console.log(`[magazine] Pas de digest ${locale} cette semaine, édition ${locale} sautée.`);
      continue;
    }
    const edition = parseDigestMagazine(readFileSync(path, 'utf-8'));
    if (!edition.magazine) {
      console.log(`[magazine] Pas de bloc magazine: dans ${path}, édition ${locale} sautée.`);
      continue;
    }
    const editionErrors = [
      ...validateMagazine(edition.magazine),
      ...checkSourcesAgainstCards(edition.magazine, opts.root),
      ...checkParity(draft.magazine, edition.magazine, locale),
    ];
    if (editionErrors.length > 0) fail(editionErrors);
    drafts.push({ locale, draft: edition });
  }

  const editions = drafts.map((d) => d.locale);
  const magDir = join(opts.root, 'docs/magazine');
  for (const { locale, draft: d } of drafts) {
    const html = renderMagazine(d, { locale, editions });
    const base = join(magDir, editionPrefix(locale));
    const latestDir = join(base, 'latest');
    const weekDir = join(base, d.weekShort);
    mkdirSync(latestDir, { recursive: true });
    mkdirSync(weekDir, { recursive: true });
    writeFileSync(join(latestDir, 'index.html'), html, 'utf-8');
    writeFileSync(join(weekDir, 'index.html'), html, 'utf-8');
    writeFileSync(join(base, 'index.html'), renderIndexPage(collectWeeksWithMeta(opts.root, locale), locale), 'utf-8');
  }

  console.log(`[magazine] Built ${draft.weekShort} — ${draft.magazine.items.length} items${editions.length > 1 ? ` (${editions.join(', ')})` : ''}`);
  return { status: 'built', weekShort: draft.weekShort };
}
