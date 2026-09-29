/**
 * scripts/content-lint/site-routes.ts
 *
 * Table des routes du site et slugs existants, lue sur le disque. Partagée par
 * le contrôle des liens internes (internal-links.ts) et celui des digests
 * (digest-check.ts) : une seule définition de ce qu'est une page existante.
 */

import fs from 'node:fs';
import path from 'node:path';
import { routing } from '../../src/i18n/routing';
import { readGuardFrontmatter } from '../../src/lib/frontmatter';
import { SCROLLY_ENABLED_DOSSIERS } from '../../src/lib/scrolly-allowlist';
import type { Pathnames, SiteRoutes } from '../../src/lib/internal-links';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const CONTENT = path.join(REPO_ROOT, 'content');
const APP = path.join(REPO_ROOT, 'src', 'app');


/**
 * Route dynamique interne → collection de contenu qui fournit ses slugs. Une
 * route absente de cette table n'a pas son slug vérifié.
 */
export const SLUG_SOURCES: Record<string, string> = {
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
export function slugsOf(dir: string): Record<string, Set<string>> {
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

export function siteRoutes(): SiteRoutes {
  const pathnames = routing.pathnames as unknown as Pathnames;
  const slugs: SiteRoutes['slugs'] = {};
  for (const [route, dir] of Object.entries(SLUG_SOURCES)) slugs[route] = slugsOf(dir);
  slugs['/dossiers/[slug]/scrolly'] = scrollySlugs(slugs['/dossiers/[slug]']!);
  return { pathnames, locales: routing.locales, unlocalized: unlocalizedRoutes(pathnames), slugs, rootEntries: rootEntries() };
}
