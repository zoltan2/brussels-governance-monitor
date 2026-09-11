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
 * langue ou le segment interne de la même route. Null pour un segment inventé.
 */
function suggestSegment(pathnames: Pathnames, locales: readonly string[], locale: string, bad: string): string | null {
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
      if (target) return target;
    }
  }
  return null;
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
