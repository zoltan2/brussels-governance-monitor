/**
 * scripts/content-lint/slug-redirects.ts
 *
 * Un slug de dossier modifié (localizedSlugs ajouté, changé ou retiré, slug
 * canonique renommé, dossier supprimé) sans redirection permanente fait
 * échouer la vérification. Règle MANDATORY de velite.config.ts et de
 * src/lib/redirects-301.ts, que rien n'appliquait jusqu'ici. Logique pure et
 * raisonnement : src/lib/slug-redirects.ts.
 *
 * Usage :
 *   npx tsx scripts/content-lint/slug-redirects.ts <base-ref>
 *
 * Compare les URL servies au point de divergence (merge-base, comme le diff
 * trois-points de run.sh) avec celles de l'arbre de travail, et valide la
 * table SLUG_REDIRECTS_301 telle qu'elle sera déployée. Sort en code 1 à la
 * première violation, en code 2 si l'état de base est illisible : on échoue
 * fermé, jamais en silence.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { routing } from '../../src/i18n/routing';
import { readGuardFrontmatter } from '../../src/lib/frontmatter';
import { DOSSIER_URLS_RETIREES, SLUG_REDIRECTS_301 } from '../../src/lib/redirects-301';
import {
  checkSlugRedirects,
  parseScrollyAllowlist,
  servedDossierUrls,
  type DossierSlugInfo,
} from '../../src/lib/slug-redirects';
import { annotate } from './annotate';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DOSSIERS_DIR = 'content/dossiers';
const ALLOWLIST_FILE = 'src/lib/scrolly-allowlist.ts';

function git(args: string[]): string {
  return execFileSync('git', ['-c', 'core.quotepath=off', ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

function toInfo(file: string, raw: string): DossierSlugInfo {
  const fm = readGuardFrontmatter(raw);
  const fromName = /\.([a-z]{2})\.mdx$/.exec(file)?.[1];
  const slug = typeof fm?.slug === 'string' ? fm.slug : undefined;
  const locale = typeof fm?.locale === 'string' ? fm.locale : fromName;
  if (!slug || !locale) throw new Error(`${file} : slug ou locale absent du frontmatter`);
  const ls = fm?.localizedSlugs;
  let localizedSlugs: Record<string, string> | undefined;
  if (ls && typeof ls === 'object' && !Array.isArray(ls)) {
    localizedSlugs = {};
    for (const [k, v] of Object.entries(ls)) if (typeof v === 'string' && v) localizedSlugs[k] = v;
  }
  return { file, locale, slug, localizedSlugs };
}

function readBase(base: string): { dossiers: DossierSlugInfo[]; allowlist: Set<string> } {
  const files = git(['ls-tree', '--name-only', `${base}:${DOSSIERS_DIR}`])
    .split('\n')
    .filter((n) => n.endsWith('.mdx'))
    .map((n) => `${DOSSIERS_DIR}/${n}`);
  if (files.length === 0) throw new Error(`aucun dossier trouvé dans ${base}:${DOSSIERS_DIR}`);
  const dossiers = files.map((f) => toInfo(f, git(['show', `${base}:${f}`])));
  const allowlist = parseScrollyAllowlist(git(['show', `${base}:${ALLOWLIST_FILE}`]));
  if (!allowlist) throw new Error(`SCROLLY_ENABLED_DOSSIERS introuvable dans ${base}:${ALLOWLIST_FILE}`);
  return { dossiers, allowlist };
}

function readWorkingTree(): { dossiers: DossierSlugInfo[]; allowlist: Set<string> } {
  const dir = path.join(REPO_ROOT, DOSSIERS_DIR);
  const dossiers = fs
    .readdirSync(dir)
    .filter((n) => n.endsWith('.mdx'))
    .sort()
    .map((n) => toInfo(`${DOSSIERS_DIR}/${n}`, fs.readFileSync(path.join(dir, n), 'utf8')));
  const allowlist = parseScrollyAllowlist(fs.readFileSync(path.join(REPO_ROOT, ALLOWLIST_FILE), 'utf8'));
  if (!allowlist) throw new Error(`SCROLLY_ENABLED_DOSSIERS introuvable dans ${ALLOWLIST_FILE}`);
  return { dossiers, allowlist };
}

/** Renommages de fichiers de dossiers depuis la base (détection git, -M). */
function readRenames(base: string): Map<string, string> {
  const out = new Map<string, string>();
  const lines = git(['diff', '-M', '--name-status', base, '--', DOSSIERS_DIR]).split('\n');
  for (const line of lines) {
    const [status, from, to] = line.split('\t');
    if (status?.startsWith('R') && from && to) out.set(from, to);
  }
  return out;
}

function main(): void {
  const baseRef = process.argv[2];
  if (!baseRef) {
    console.error('usage : slug-redirects.ts <base-ref>');
    process.exit(2);
  }

  let base: string;
  let before: ReturnType<typeof readBase>;
  let after: ReturnType<typeof readWorkingTree>;
  let renames: Map<string, string>;
  try {
    base = git(['merge-base', baseRef, 'HEAD']).trim();
    before = readBase(base);
    after = readWorkingTree();
    renames = readRenames(base);
  } catch (err) {
    const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
    console.error(`ERREUR : slugs et redirections, lecture impossible (${msg}). Contrôle en échec fermé.`);
    annotate('Slugs et redirections : lecture impossible', msg ?? '');
    process.exit(2);
  }

  const violations = checkSlugRedirects({
    locales: routing.locales,
    before: { dossiers: before.dossiers, scrollyAllowlist: before.allowlist },
    after: { dossiers: after.dossiers, scrollyAllowlist: after.allowlist },
    renames,
    redirects: SLUG_REDIRECTS_301,
    retired: DOSSIER_URLS_RETIREES,
  });

  if (violations.length === 0) {
    // Témoin : un « OK » sur zéro URL lue serait une panne, pas un succès.
    const nBefore = servedDossierUrls({ dossiers: before.dossiers, scrollyAllowlist: before.allowlist }, routing.locales).served.length;
    const nAfter = servedDossierUrls({ dossiers: after.dossiers, scrollyAllowlist: after.allowlist }, routing.locales).served.length;
    if (nBefore === 0 || nAfter === 0) {
      console.error(`ERREUR : aucune URL de dossier calculée (base ${nBefore}, branche ${nAfter}). Contrôle en échec fermé.`);
      process.exit(2);
    }
    console.log(
      `OK: slugs de dossiers et redirections (${nBefore} URL servies sur la base ${base.slice(0, 8)}, ` +
        `${nAfter} sur la branche, ${SLUG_REDIRECTS_301.length} redirection(s))`,
    );
    return;
  }

  console.error('FAIL: URL de dossier perdue ou table de redirections invalide :\n');
  for (const v of violations) {
    console.error(`  [${v.kind}] ${v.message}`);
    annotate('Slug de dossier sans redirection', v.message, 'src/lib/redirects-301.ts');
  }
  const fixes = violations.flatMap((v) => (v.fix ? [v.fix] : []));
  if (fixes.length > 0) {
    console.error('\nEntrées à ajouter (ou à substituer) dans SLUG_REDIRECTS_301, src/lib/redirects-301.ts :');
    for (const f of fixes) console.error(`  { from: '${f.from}', to: '${f.to}' },`);
  }
  console.error(
    '\nRègle MANDATORY (velite.config.ts, champ localizedSlugs) : une URL de dossier qui change doit\n' +
      'livrer sa redirection permanente dans le même commit, sinon les liens externes tombent en 404.',
  );
  process.exit(1);
}

main();
