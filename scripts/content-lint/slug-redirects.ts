/**
 * scripts/content-lint/slug-redirects.ts
 *
 * Une page publiée (dossier, domaine, solution, secteur, comparaison,
 * commune, archive, vérification) dont l'URL disparaît sans redirection
 * permanente fait échouer la vérification : slug renommé, `localizedSlugs`
 * d'un dossier changé, fiche supprimée, segment localisé renommé dans
 * src/i18n/routing.ts. Règle MANDATORY de src/lib/redirects-301.ts. Logique
 * pure et modèle des URL servies : src/lib/slug-redirects.ts.
 *
 * Usage :
 *   npx tsx scripts/content-lint/slug-redirects.ts <base-ref>
 *
 * Compare les URL servies au point de divergence (merge-base, comme le diff
 * trois-points de run.sh) avec celles de l'arbre de travail, et valide la
 * table SLUG_REDIRECTS_301 telle qu'elle sera déployée. Lit le contenu brut
 * des deux révisions (git show), sans build Velite. Sort en code 1 à la
 * première violation, en code 2 si un état est illisible : on échoue fermé,
 * jamais en silence.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { routing } from '../../src/i18n/routing';
import { readGuardFrontmatter } from '../../src/lib/frontmatter';
import { SLUG_REDIRECTS_301, URLS_RETIREES } from '../../src/lib/redirects-301';
import {
  PAGE_TYPES,
  PAGE_TYPE_NAMES,
  checkSlugRedirects,
  countByType,
  parseScrollyAllowlist,
  parseSlugPathnames,
  routesByType,
  servedUrls,
  type ContentEntry,
  type PageType,
  type SlugSnapshot,
} from '../../src/lib/slug-redirects';
import { annotate } from './annotate';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ALLOWLIST_FILE = 'src/lib/scrolly-allowlist.ts';
const ROUTING_FILE = 'src/i18n/routing.ts';

function git(args: string[]): string {
  return execFileSync('git', ['-c', 'core.quotepath=off', ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

function toEntry(type: PageType, file: string, raw: string): ContentEntry {
  const fm = readGuardFrontmatter(raw);
  const fromName = /\.([a-z]{2})\.mdx$/.exec(file)?.[1];
  const slug = typeof fm?.slug === 'string' ? fm.slug : undefined;
  const locale = typeof fm?.locale === 'string' ? fm.locale : fromName;
  if (!slug || !locale) throw new Error(`${file} : slug ou locale absent du frontmatter`);
  const entry: ContentEntry = { file, locale, slug, draft: fm?.draft === true };
  const ls = fm?.localizedSlugs;
  if (ls && typeof ls === 'object' && !Array.isArray(ls)) {
    entry.localizedSlugs = {};
    for (const [k, v] of Object.entries(ls)) if (typeof v === 'string' && v) entry.localizedSlugs[k] = v;
  }
  if (PAGE_TYPES[type].model === 'native-only') {
    // L'URL d'une vérification dérive de cardSlug et date, pas de slug.
    if (typeof fm?.cardSlug !== 'string' || typeof fm?.date !== 'string') {
      throw new Error(`${file} : cardSlug ou date absent du frontmatter`);
    }
    entry.cardSlug = fm.cardSlug;
    entry.date = fm.date;
  }
  return entry;
}

/** Fichiers .mdx d'un dossier de contenu à une révision ; [] si le dossier n'existe pas. */
function listAt(base: string, dir: string): string[] {
  const out = git(['ls-tree', '--name-only', base, `${dir}/`]).split('\n').filter(Boolean);
  return out.filter((n) => n.endsWith('.mdx') && !n.slice(dir.length + 1).includes('/'));
}

function readSnapshot(read: (file: string) => string, list: (dir: string) => string[]): SlugSnapshot {
  const entries: SlugSnapshot['entries'] = {};
  for (const type of PAGE_TYPE_NAMES) {
    entries[type] = list(PAGE_TYPES[type].dir).map((f) => toEntry(type, f, read(f)));
  }
  const allowlist = parseScrollyAllowlist(read(ALLOWLIST_FILE));
  if (!allowlist) throw new Error(`SCROLLY_ENABLED_DOSSIERS introuvable dans ${ALLOWLIST_FILE}`);
  const pathnames = parseSlugPathnames(read(ROUTING_FILE), routing.locales);
  if (!pathnames || Object.keys(pathnames).length === 0) {
    throw new Error(`aucune route [slug] lue dans ${ROUTING_FILE}`);
  }
  return { entries, routes: routesByType(pathnames), scrollyAllowlist: allowlist };
}

function readBase(base: string): SlugSnapshot {
  return readSnapshot(
    (f) => git(['show', `${base}:${f}`]),
    (dir) => listAt(base, dir),
  );
}

function readWorkingTree(): SlugSnapshot {
  return readSnapshot(
    (f) => fs.readFileSync(path.join(REPO_ROOT, f), 'utf8'),
    (dir) => {
      const abs = path.join(REPO_ROOT, dir);
      if (!fs.existsSync(abs)) return [];
      return fs
        .readdirSync(abs)
        .filter((n) => n.endsWith('.mdx'))
        .sort()
        .map((n) => `${dir}/${n}`);
    },
  );
}

/**
 * Pages statiques servies (cibles admises) : chaque entrée sans paramètre de
 * routing.ts dont le fichier page.tsx existe, dans chaque langue.
 */
function staticPages(): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(routing.pathnames)) {
    if (key === '/' || key.includes('[')) continue;
    if (!fs.existsSync(path.join(REPO_ROOT, 'src/app/[locale]', key, 'page.tsx'))) continue;
    for (const locale of routing.locales) {
      const local = typeof value === 'string' ? value : (value as Record<string, string>)[locale];
      if (local) out.push(`/${locale}${local}`);
    }
  }
  return out;
}

/** Renommages de fichiers de contenu depuis la base (détection git, -M). */
function readRenames(base: string): Map<string, string> {
  const out = new Map<string, string>();
  const dirs = PAGE_TYPE_NAMES.map((t) => PAGE_TYPES[t].dir);
  const lines = git(['diff', '-M', '--name-status', base, '--', ...dirs]).split('\n');
  for (const line of lines) {
    const [status, from, to] = line.split('\t');
    if (status?.startsWith('R') && from && to) out.set(from, to);
  }
  return out;
}

const formatCounts = (c: Record<PageType, number>) => PAGE_TYPE_NAMES.map((t) => `${t} ${c[t]}`).join(', ');

function main(): void {
  const baseRef = process.argv[2];
  if (!baseRef) {
    console.error('usage : slug-redirects.ts <base-ref>');
    process.exit(2);
  }

  let base: string;
  let before: SlugSnapshot;
  let after: SlugSnapshot;
  let renames: Map<string, string>;
  try {
    base = git(['merge-base', baseRef, 'HEAD']).trim();
    before = readBase(base);
    after = readWorkingTree();
    renames = readRenames(base);
  } catch (err) {
    const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
    console.error(`ERREUR : pages et redirections, lecture impossible (${msg}). Contrôle en échec fermé.`);
    annotate('Pages et redirections : lecture impossible', msg ?? '');
    process.exit(2);
  }

  const statics = staticPages();
  const violations = checkSlugRedirects({
    locales: routing.locales,
    before,
    after,
    renames,
    redirects: SLUG_REDIRECTS_301,
    retired: URLS_RETIREES,
    staticPages: statics,
  });

  if (violations.length === 0) {
    // Témoin : un « OK » sur zéro URL lue serait une panne, pas un succès. Un
    // type qui a des fichiers mais aucune URL l'est aussi.
    const cBefore = countByType(servedUrls(before, routing.locales).served);
    const cAfter = countByType(servedUrls(after, routing.locales).served);
    for (const [label, snap, counts] of [
      ['base', before, cBefore],
      ['branche', after, cAfter],
    ] as const) {
      for (const t of PAGE_TYPE_NAMES) {
        if ((snap.entries[t]?.length ?? 0) > 0 && counts[t] === 0) {
          console.error(`ERREUR : ${t} a des fiches sur la ${label} mais aucune URL calculée. Contrôle en échec fermé.`);
          process.exit(2);
        }
      }
    }
    const total = (c: Record<PageType, number>) => PAGE_TYPE_NAMES.reduce((n, t) => n + c[t], 0);
    if (total(cBefore) === 0 || total(cAfter) === 0 || statics.length === 0) {
      console.error(
        `ERREUR : aucune URL calculée (base ${total(cBefore)}, branche ${total(cAfter)}, pages statiques ${statics.length}). Contrôle en échec fermé.`,
      );
      process.exit(2);
    }
    console.log(
      `OK: pages publiées et redirections (${total(cBefore)} URL servies sur la base ${base.slice(0, 8)}, ` +
        `${total(cAfter)} sur la branche, ${SLUG_REDIRECTS_301.length} redirection(s), ${URLS_RETIREES.length} URL retirée(s))\n` +
        `  base    : ${formatCounts(cBefore)}\n` +
        `  branche : ${formatCounts(cAfter)}`,
    );
    return;
  }

  console.error('FAIL: URL de page publiée perdue ou table de redirections invalide :\n');
  for (const v of violations) {
    console.error(`  [${v.kind}] ${v.message}`);
    annotate('Page publiée sans redirection', v.message, 'src/lib/redirects-301.ts');
  }
  const fixes = violations.flatMap((v) => (v.fix ? [v.fix] : []));
  if (fixes.length > 0) {
    console.error('\nEntrées à ajouter (ou à substituer) dans SLUG_REDIRECTS_301, src/lib/redirects-301.ts :');
    for (const f of fixes) console.error(`  { from: '${f.from}', to: '${f.to}' },`);
  }
  console.error(
    "\nRègle MANDATORY (src/lib/redirects-301.ts) : une URL de page publiée qui change doit livrer\n" +
      'sa redirection permanente dans le même commit, sinon les liens externes tombent en 404.\n' +
      'Suppression voulue sans successeur : une entrée { path, raison } dans URLS_RETIREES.',
  );
  process.exit(1);
}

main();
