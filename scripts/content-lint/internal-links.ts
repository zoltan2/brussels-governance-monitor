/**
 * scripts/content-lint/internal-links.ts
 *
 * Vérifie que chaque lien interne du contenu mène, sans redirection, à une
 * page existante de sa langue : chemin complet de la bonne langue
 * (/nl/domeinen/ et non /nl/bereiche/), préfixe de langue présent et connu,
 * fiche existante. La logique et son historique sont dans
 * src/lib/internal-links.ts ; les tables de vérité sont src/i18n/routing.ts,
 * les routes de src/app et les fiches de content/.
 *
 * Tout le dépôt est vérifié, pas seulement les fiches modifiées : un changement
 * de la table de routage peut casser des liens dans des fiches que personne ne
 * touche. Le coût est d'une seconde.
 *
 * content/digest/ est exclu : ce sont les archives d'emails déjà envoyés, et le
 * robot qui les écrit pousse sur main sans PR. Leurs liens sont corrigés à la
 * source, dans le générateur de bgm-ops.
 *
 * Usage :
 *   npx tsx scripts/content-lint/internal-links.ts
 *     Sort en code 1 au premier lien fautif. Mode CI et pré-vol.
 *   npx tsx scripts/content-lint/internal-links.ts --audit
 *     Affiche aussi les archives du digest, ne bloque jamais.
 */

import fs from 'node:fs';
import path from 'node:path';
import { routing } from '../../src/i18n/routing';
import { annotate } from './annotate';
import { readGuardFrontmatter } from '../../src/lib/frontmatter';
import { SCROLLY_ENABLED_DOSSIERS } from '../../src/lib/scrolly-allowlist';
import { findLinkProblems, type LinkProblem, type Pathnames, type SiteRoutes } from '../../src/lib/internal-links';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONTENT = path.join(REPO_ROOT, 'content');
const EXCLUDED = [path.join(CONTENT, 'digest') + path.sep];
const APP = path.join(REPO_ROOT, 'src', 'app');

/**
 * Route dynamique interne → collection de contenu qui fournit ses slugs. Une
 * route absente de cette table n'a pas son slug vérifié.
 */
const SLUG_SOURCES: Record<string, string> = {
  '/domains/[slug]': 'domain-cards',
  '/dossiers/[slug]': 'dossiers',
  '/sectors/[slug]': 'sector-cards',
  '/communes/[slug]': 'commune-cards',
  '/comparisons/[slug]': 'comparison-cards',
  '/solutions/[slug]': 'solution-cards',
  '/archives/[slug]': 'archive-pages',
};

/**
 * Slugs par langue : nom de fichier `slug.locale.mdx` (identique au champ
 * slug, vérifié le 2026-09-11), plus le slug localisé que la fiche déclare
 * dans `localizedSlugs` pour sa langue (servi par getLocalizedSlug).
 */
function slugsOf(dir: string): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  const abs = path.join(CONTENT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const name of fs.readdirSync(abs)) {
    const m = name.match(/^(.+)\.([a-z]{2})\.mdx$/);
    if (!m) continue;
    const set = (out[m[2]!] ??= new Set());
    set.add(m[1]!);
    try {
      const localizedSlugs = readGuardFrontmatter(fs.readFileSync(path.join(abs, name), 'utf8'))?.localizedSlugs;
      const own = localizedSlugs && typeof localizedSlugs === 'object' ? (localizedSlugs as Record<string, unknown>)[m[2]!] : undefined;
      if (typeof own === 'string' && own) set.add(own);
    } catch {
      // Frontmatter illisible : faq-check le signale ; ici on garde le nom de fichier.
    }
  }
  return out;
}

/** Vues immersives : seules les fiches de l'allowlist en ont une (500 ou 404 sinon). */
function scrollySlugs(dossiers: Record<string, ReadonlySet<string>>): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const [locale, set] of Object.entries(dossiers)) {
    out[locale] = new Set([...set].filter((slug) => SCROLLY_ENABLED_DOSSIERS.has(slug)));
  }
  return out;
}

/** Routes de src/app/[locale] absentes de la table de routage. */
function unlocalizedRoutes(pathnames: Pathnames): string[] {
  const out: string[] = [];
  const base = path.join(APP, '[locale]');
  const walk = (dir: string, rel: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(dir, entry.name), `${rel}/${entry.name}`);
      else if (entry.name === 'page.tsx') {
        const route = rel.replace(/\/\([^)]+\)/g, '') || '/';
        if (!(route in pathnames)) out.push(route);
      }
    }
  };
  walk(base, '');
  return out.sort();
}

/** Premiers segments servis hors [locale] : dossiers de src/app et entrées de public/. */
function rootEntries(): Set<string> {
  const out = new Set<string>();
  for (const e of fs.readdirSync(APP, { withFileTypes: true })) {
    if (e.isDirectory() && !e.name.startsWith('[') && !e.name.startsWith('(')) out.add(e.name);
  }
  for (const name of fs.readdirSync(path.join(REPO_ROOT, 'public'))) out.add(name);
  return out;
}

function siteRoutes(): SiteRoutes {
  const pathnames = routing.pathnames as unknown as Pathnames;
  const slugs: SiteRoutes['slugs'] = {};
  for (const [route, dir] of Object.entries(SLUG_SOURCES)) slugs[route] = slugsOf(dir);
  slugs['/dossiers/[slug]/scrolly'] = scrollySlugs(slugs['/dossiers/[slug]']!);
  return { pathnames, locales: routing.locales, unlocalized: unlocalizedRoutes(pathnames), slugs, rootEntries: rootEntries() };
}

/** Langue de la fiche, depuis `nom.locale.mdx`. */
function fileLocale(abs: string): string | undefined {
  return path.basename(abs).match(/\.([a-z]{2})\.mdx$/)?.[1];
}

const REASONS: Record<LinkProblem['kind'], string> = {
  'wrong-locale-path': "chemin d'une autre langue",
  'unknown-path': 'aucune route ne correspond (404 probable)',
  'unknown-slug': "cette fiche n'existe pas dans cette langue (404)",
  'foreign-prefix': "préfixe d'une langue que le site n'a pas (404)",
  'no-locale': 'lien sans langue, redirigé vers le français',
};

function listMdx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listMdx(abs));
    else if (entry.name.endsWith('.mdx')) out.push(abs);
  }
  return out.sort();
}

function main(): void {
  const audit = process.argv.includes('--audit');
  const routes = siteRoutes();

  let scannedLinks = 0;
  let checkedLinks = 0;
  const blocking: { file: string; m: LinkProblem }[] = [];
  const archived: { file: string; m: LinkProblem }[] = [];

  for (const abs of listMdx(CONTENT)) {
    const content = fs.readFileSync(abs, 'utf8');
    const count = (content.match(/\]\(\/(?!\/)/g) ?? []).length;
    const isArchive = EXCLUDED.some((prefix) => abs.startsWith(prefix));
    scannedLinks += count;
    if (!isArchive) checkedLinks += count;
    for (const m of findLinkProblems(content, routes, fileLocale(abs))) {
      (isArchive ? archived : blocking).push({ file: path.relative(REPO_ROOT, abs), m });
    }
  }

  // Des milliers de liens existent : n'en voir aucun signifie que le check est
  // aveugle (dossier déplacé, syntaxe changée), pas que tout va bien.
  if (scannedLinks === 0) {
    console.error('ERREUR : aucun lien interne trouvé dans content/. Le check est aveugle.');
    process.exit(1);
  }

  const print = (rows: { file: string; m: LinkProblem }[], stream: (s: string) => void) => {
    for (const { file, m } of rows) {
      const fix = m.suggestion ? ` ; remplacer par ${m.suggestion}` : '';
      stream(`  ${file}:${m.line}  ${m.link}  ->  ${REASONS[m.kind]}${fix}`);
    }
  };

  if (audit) {
    console.log(`${scannedLinks} lien(s) interne(s) examiné(s).`);
    console.log(`Hors archives : ${blocking.length} lien(s) fautif(s).`);
    print(blocking, console.log);
    console.log(`Archives du digest (non bloquant) : ${archived.length} lien(s) hors table.`);
    print(archived, console.log);
    return;
  }

  if (blocking.length === 0) {
    const note = archived.length > 0 ? ` Archives du digest non vérifiées : ${archived.length} lien(s) hors table (npm run lint:links).` : '';
    console.log(`OK : ${checkedLinks} lien(s) interne(s) hors archives, tous vers une page existante de leur langue.${note}`);
    return;
  }

  console.error(`FAIL : ${blocking.length} lien(s) interne(s) qui ne mènent pas à une page existante de leur langue :\n`);
  print(blocking, console.error);
  for (const { file, m } of blocking.slice(0, 8)) {
    annotate('Lien interne à corriger', `${file}:${m.line} ${m.link} : ${REASONS[m.kind]}${m.suggestion ? `, remplacer par ${m.suggestion}` : ''}.`, file);
  }
  console.error('');
  console.error('Chaque langue a ses propres chemins (domaines, domeinen, domains, bereiche…).');
  console.error("Un chemin d'une autre langue ou sans langue passe par une redirection, un chemin ou");
  console.error('une fiche inconnus renvoient une 404. Table de vérité : src/i18n/routing.ts et content/.');
  process.exit(1);
}

main();
