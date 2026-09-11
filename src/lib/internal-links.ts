// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Segments de route des liens internes du contenu.
 *
 * Les routes sont localisées : les fiches domaine vivent sous /fr/domaines/,
 * /nl/domeinen/, /en/domains/ et /de/bereiche/. Un lien écrit avec le segment
 * d'une autre langue passe par une redirection 307 de next-intl, et un
 * segment inventé renvoie une 404. Constat du 2026-09-11 : 30 liens hors table,
 * dont 4 en /de/domaenen/, cassés en production depuis les veilles du 9 août
 * et du 6 septembre.
 *
 * La table de vérité est `routing.pathnames` (src/i18n/routing.ts), passée en
 * paramètre : ce module ne contient que la logique, sans import de next-intl,
 * pour rester testable isolément.
 */

export type Pathnames = Record<string, string | Record<string, string>>;

export interface RouteMismatch {
  /** Numéro de ligne, à partir de 1. */
  line: number;
  locale: string;
  /** Segment fautif. */
  segment: string;
  /** Lien tel qu'écrit, sans le « ]( » ni la parenthèse fermante. */
  link: string;
  /** Même lien avec le bon segment, ou null si le segment n'appartient à aucune route. */
  suggestion: string | null;
}

function firstSegment(path: string): string | undefined {
  return path.split('/').filter(Boolean)[0];
}

function localized(value: string | Record<string, string>, locale: string): string | undefined {
  return typeof value === 'string' ? value : value[locale];
}

/** Premiers segments valides, par langue, depuis la table de routage. */
export function validSegmentsByLocale(
  pathnames: Pathnames,
  locales: readonly string[],
): Record<string, Set<string>> {
  const valid: Record<string, Set<string>> = {};
  for (const locale of locales) valid[locale] = new Set();
  for (const value of Object.values(pathnames)) {
    for (const locale of locales) {
      const path = localized(value, locale);
      const seg = path ? firstSegment(path) : undefined;
      if (seg) valid[locale]!.add(seg);
    }
  }
  return valid;
}

/**
 * Bon segment pour `locale`, quand le segment fautif est celui d'une autre
 * langue ou le segment interne de la même route. Null pour un segment inventé,
 * et null aussi quand plusieurs routes partagent ce segment avec des cibles
 * différentes : `comprendre` est à la fois explainers et understand, et pour
 * /en/ les deux corrections sont possibles. Mieux vaut ne rien proposer qu'une
 * correction fausse.
 */
function suggestSegment(pathnames: Pathnames, locales: readonly string[], locale: string, bad: string): string | null {
  const targets = new Set<string>();
  for (const [internal, value] of Object.entries(pathnames)) {
    const family = new Set<string>();
    const internalSeg = firstSegment(internal);
    if (internalSeg) family.add(internalSeg);
    for (const l of locales) {
      const seg = firstSegment(localized(value, l) ?? '');
      if (seg) family.add(seg);
    }
    if (family.has(bad)) {
      const target = firstSegment(localized(value, locale) ?? '');
      if (target) targets.add(target);
    }
  }
  return targets.size === 1 ? [...targets][0]! : null;
}

/**
 * Liens Markdown internes `](/<langue>/<segment>…)` dont le segment n'existe
 * pas pour cette langue. Les liens absolus (https://…) ne sont pas concernés.
 */
export function findRouteMismatches(
  content: string,
  pathnames: Pathnames,
  locales: readonly string[],
): RouteMismatch[] {
  const valid = validSegmentsByLocale(pathnames, locales);
  const localeAlt = locales.map((l) => l.replace(/[^a-z-]/g, '')).join('|');
  const re = new RegExp(`\\]\\(/(${localeAlt})/([a-z0-9-]+)([^)\\s]*)\\)`, 'g');

  const mismatches: RouteMismatch[] = [];
  content.split('\n').forEach((text, i) => {
    for (const m of text.matchAll(re)) {
      const locale = m[1]!;
      const segment = m[2]!;
      const rest = m[3] ?? '';
      if (valid[locale]!.has(segment)) continue;
      const fixed = suggestSegment(pathnames, locales, locale, segment);
      mismatches.push({
        line: i + 1,
        locale,
        segment,
        link: `/${locale}/${segment}${rest}`,
        suggestion: fixed ? `/${locale}/${fixed}${rest}` : null,
      });
    }
  });
  return mismatches;
}

/*
 * ---------------------------------------------------------------------------
 * Contrôle du chemin complet.
 *
 * `findRouteMismatches` ne regarde que le premier segment, et seulement sous
 * /fr, /nl, /en, /de. La revue du 2026-09-11 a relevé ce qui lui échappait :
 * - un sous-chemin d'une autre langue sous un premier segment valide :
 *   /fr/comprendre/machtsniveaus (le segment néerlandais de l'explainer) ;
 * - un préfixe de langue que le site n'a pas : /es/…, redirigé vers /fr/es/…
 *   puis 404 ;
 * - un lien sans langue : /communes/saint-gilles, redirigé vers le français
 *   même depuis une fiche néerlandaise ;
 * - un slug qui n'existe pas : /fr/dossiers/numerique, 404.
 * ---------------------------------------------------------------------------
 */

export type LinkProblemKind =
  /** Chemin d'une autre langue, ou chemin interne : la correction est sûre. */
  | 'wrong-locale-path'
  /** Aucune route ne correspond. */
  | 'unknown-path'
  /** La route existe, pas la fiche. */
  | 'unknown-slug'
  /** Préfixe à deux lettres qui n'est pas une langue du site. */
  | 'foreign-prefix'
  /** Lien vers une route du site sans préfixe de langue. */
  | 'no-locale';

export interface LinkProblem {
  line: number;
  /** Lien tel qu'écrit, sans « ]( » ni la parenthèse fermante. */
  link: string;
  kind: LinkProblemKind;
  /** Lien corrigé quand la correction est certaine, sinon null. */
  suggestion: string | null;
}

export interface SiteRoutes {
  pathnames: Pathnames;
  locales: readonly string[];
  /**
   * Routes de `[locale]` absentes de `pathnames` (`/subscribe`,
   * `/dossiers/[slug]/scrolly`) : next-intl les sert au même chemin dans
   * toutes les langues.
   */
  unlocalized?: readonly string[];
  /** Slugs existants par route dynamique interne, puis par langue. */
  slugs?: Record<string, Record<string, ReadonlySet<string>>>;
  /**
   * Premiers segments servis hors `[locale]` : `digest`, `feed`, `api`, et les
   * fichiers et dossiers de `public/`. Un lien vers eux n'a pas de langue.
   */
  rootEntries?: ReadonlySet<string>;
}

interface RoutePattern {
  internal: string;
  segments: string[];
}

const splitPath = (p: string) => p.split('/').filter(Boolean);
const isParam = (seg: string) => /^\[[^\]]+\]$/.test(seg);

function patternsFor(routes: SiteRoutes, locale: string): RoutePattern[] {
  const out: RoutePattern[] = [];
  for (const [internal, value] of Object.entries(routes.pathnames)) {
    const localizedPath = localized(value, locale);
    if (localizedPath !== undefined) out.push({ internal, segments: splitPath(localizedPath) });
  }
  for (const internal of routes.unlocalized ?? []) out.push({ internal, segments: splitPath(internal) });
  return out;
}

/** Paramètres capturés si `segments` correspond au motif, sinon null. */
function matchPattern(segments: string[], pattern: RoutePattern): Record<string, string> | null {
  if (segments.length !== pattern.segments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < segments.length; i++) {
    const p = pattern.segments[i]!;
    if (isParam(p)) params[p.slice(1, -1)] = segments[i]!;
    else if (p !== segments[i]) return null;
  }
  return params;
}

function fill(pattern: string, params: Record<string, string>): string {
  return pattern.replace(/\[([^\]]+)\]/g, (_, name: string) => params[name] ?? `[${name}]`);
}

/**
 * Routes internes auxquelles `segments` correspond, avec les paramètres
 * capturés. Chaque position accepte le segment de n'importe quelle langue ou
 * de la forme interne de la route : un lien qui mélange les langues
 * (/fr/comprendre/machtsniveaus, premier segment français, second
 * néerlandais) se résout aussi. C'est le cas que produisait une correction du
 * seul premier segment.
 */
function resolveAnywhere(segments: string[], routes: SiteRoutes): Map<string, Record<string, string>> {
  const found = new Map<string, Record<string, string>>();
  const entries: Array<[string, string[][]]> = [];
  for (const [internal, value] of Object.entries(routes.pathnames)) {
    const variants = [internal, ...routes.locales.map((l) => localized(value, l)).filter((v): v is string => !!v)].map(splitPath);
    entries.push([internal, variants]);
  }
  for (const internal of routes.unlocalized ?? []) entries.push([internal, [splitPath(internal)]]);

  for (const [internal, variants] of entries) {
    if (variants.some((v) => v.length !== segments.length)) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < segments.length && ok; i++) {
      const allowed = variants.map((v) => v[i]!);
      const param = allowed.find(isParam);
      if (param) params[param.slice(1, -1)] = segments[i]!;
      else ok = allowed.includes(segments[i]!);
    }
    if (ok) found.set(internal, params);
  }
  return found;
}

/** Chemin localisé pour `locale`, si la route interne est connue. */
function localize(routes: SiteRoutes, internal: string, params: Record<string, string>, locale: string): string | null {
  const value = routes.pathnames[internal];
  const target = value !== undefined ? localized(value, locale) : routes.unlocalized?.includes(internal) ? internal : undefined;
  if (target === undefined) return null;
  const path = fill(target, params);
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

/** Correction certaine : une seule route interne possible, et un slug existant. */
function uniqueFix(segments: string[], routes: SiteRoutes, locale: string, suffix: string): string | null {
  const found = resolveAnywhere(segments, routes);
  const fixes = new Set<string>();
  for (const [internal, params] of found) {
    if (!slugExists(routes, internal, params, locale)) continue;
    const path = localize(routes, internal, params, locale);
    if (path) fixes.add(path);
  }
  return fixes.size === 1 ? `${[...fixes][0]!}${suffix}` : null;
}

function slugExists(routes: SiteRoutes, internal: string, params: Record<string, string>, locale: string): boolean {
  const slug = params.slug;
  const known = routes.slugs?.[internal]?.[locale];
  return slug === undefined || known === undefined || known.has(slug);
}

/**
 * Liens Markdown internes `](/…)` qui ne mènent pas, sans redirection, à une
 * page existante de la bonne langue. `fileLocale` (langue de la fiche) sert à
 * proposer une correction pour un lien sans langue ou d'une langue étrangère.
 */
export function findLinkProblems(content: string, routes: SiteRoutes, fileLocale?: string): LinkProblem[] {
  const problems: LinkProblem[] = [];
  const locales = new Set(routes.locales);

  content.split('\n').forEach((text, i) => {
    for (const m of text.matchAll(/\]\((\/[^)\s]*)\)/g)) {
      const link = m[1]!;
      if (link.startsWith('//')) continue; // URL relative au protocole : externe.
      const cut = link.search(/[?#]/);
      const pathPart = cut === -1 ? link : link.slice(0, cut);
      const suffix = cut === -1 ? '' : link.slice(cut);
      const segments = splitPath(pathPart);
      const first = segments[0];
      const push = (kind: LinkProblemKind, suggestion: string | null) =>
        problems.push({ line: i + 1, link, kind, suggestion });

      if (first === undefined) continue; // « / » : redirigé vers la langue du visiteur.

      if (locales.has(first)) {
        const rest = segments.slice(1);
        const own = patternsFor(routes, first)
          .map((pattern) => ({ pattern, params: matchPattern(rest, pattern) }))
          .filter((x) => x.params !== null);
        if (own.length > 0) {
          if (!own.some((x) => slugExists(routes, x.pattern.internal, x.params!, first))) push('unknown-slug', null);
          continue;
        }
        const fix = uniqueFix(rest, routes, first, suffix);
        push(fix ? 'wrong-locale-path' : 'unknown-path', fix);
        continue;
      }

      if (routes.rootEntries?.has(first)) continue;

      if (/^[a-z]{2}$/.test(first)) {
        push('foreign-prefix', fileLocale ? uniqueFix(segments.slice(1), routes, fileLocale, suffix) : null);
        continue;
      }

      push('no-locale', fileLocale ? uniqueFix(segments, routes, fileLocale, suffix) : null);
    }
  });
  return problems;
}
