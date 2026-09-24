// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { getPathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const siteName = 'Brussels Governance Monitor';

/** OpenGraph expects regional locale codes (e.g. fr_BE, not just fr) */
const ogLocaleMap: Record<string, string> = {
  fr: 'fr_BE',
  nl: 'nl_BE',
  en: 'en_US',
  de: 'de_DE',
};

type Href = Parameters<typeof getPathname>[0]['href'];

/**
 * Resolve an internal path string (e.g. '/domains/budget') to a typed
 * next-intl Href that getPathname can process.
 */
function pathToHref(path: string): Href {
  const pathnames = routing.pathnames as Record<string, unknown>;

  // Direct match: static/index pages (e.g. '/changelog', '/domains')
  if (pathnames[path]) {
    return path as Href;
  }

  // Dynamic route: '/domains/budget' → { pathname: '/domains/[slug]', params: { slug: 'budget' } }
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash > 0) {
    const prefix = path.substring(0, lastSlash);
    const slug = path.substring(lastSlash + 1);
    const pattern = `${prefix}/[slug]`;
    if (pathnames[pattern]) {
      return { pathname: pattern, params: { slug } } as unknown as Href;
    }
  }

  // Fallback: return as-is (will produce /{locale}{path})
  return path as Href;
}

/**
 * Absolute canonical URL for an internal route path, with the segment LOCALIZED.
 *
 * `/domains/budget` in fr gives `<site>/fr/domaines/budget`, never `/fr/domains/budget`,
 * which only exists as a 307 redirect. Use it anywhere a page URL is published to the
 * outside: citations, JSON-LD, share links. Hand built template strings drifted from the
 * routing table on five detail pages (domains, sectors, comparisons, solutions, communes).
 */
export function canonicalUrl(locale: string, path: string): string {
  return `${siteUrl}${getPathname({ locale: locale as Locale, href: pathToHref(path) })}`;
}

const DESCRIPTION_MAX = 160;
/** Below this length, a sentence cut leaves too little to be worth it; cut on a word. */
const SENTENCE_CUT_MIN = 100;

/**
 * Shorten a meta description to at most 160 characters without breaking a word.
 *
 * Prefers ending on a full sentence when one closes after 100 characters; otherwise
 * cuts on the last space and adds an ellipsis. The previous hard cut at 157 characters
 * printed fragments such as "La r..." in search results.
 */
export function truncateDescription(text: string, max = DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;

  const window = clean.slice(0, max);
  const sentenceEnd = Math.max(
    window.lastIndexOf('. '),
    window.lastIndexOf('! '),
    window.lastIndexOf('? '),
  );
  if (sentenceEnd >= SENTENCE_CUT_MIN) return window.slice(0, sentenceEnd + 1);

  const lastSpace = clean.slice(0, max - 1).lastIndexOf(' ');
  const cut = lastSpace > 0 ? clean.slice(0, lastSpace) : clean.slice(0, max - 1);
  return `${cut.replace(/[\s,;:.–—-]+$/u, '')}…`;
}

/**
 * Title and description a card shows to search engines.
 *
 * `seoTitle` is written to fit Google's ~60 characters on its own, so it goes out
 * as is (`absoluteTitle`), without the ' | BGM' suffix of the layout template.
 * Without it, the card keeps its `title` and the suffix, as before.
 * The visible H1 is always `title`; only the search result changes.
 *
 * Généralisé le 21/09/2026. Les deux champs n'existaient que sur les dossiers,
 * alors que les fiches secteur sont les pires contrevenantes au budget de titre
 * (44 sur 44 hors budget, moyenne de 86 à 93 caractères) et n'avaient aucun
 * moyen de s'en sortir. Le repli de description diffère d'une collection à
 * l'autre — `summary` pour un domaine, `humanImpact` pour un secteur,
 * `methodology` pour une comparaison — d'où le paramètre explicite plutôt qu'un
 * champ deviné.
 */
export function searchMeta(card: {
  title: string;
  /** Description utilisée quand `seoDescription` est absent. */
  fallbackDescription: string;
  seoTitle?: string;
  seoDescription?: string;
}): { title: string; absoluteTitle: boolean; description: string } {
  const seoTitle = card.seoTitle?.trim();
  const seoDescription = card.seoDescription?.trim();
  return {
    title: seoTitle || card.title,
    absoluteTitle: Boolean(seoTitle),
    description: seoDescription || card.fallbackDescription,
  };
}

/**
 * Variante dossier, conservée parce que son repli de description est `summary`
 * et que le gabarit dossier l'appelle avec la fiche entière.
 */
export function dossierSearchMeta(card: {
  title: string;
  summary: string;
  seoTitle?: string;
  seoDescription?: string;
}): { title: string; absoluteTitle: boolean; description: string } {
  return searchMeta({
    title: card.title,
    fallbackDescription: card.summary,
    seoTitle: card.seoTitle,
    seoDescription: card.seoDescription,
  });
}

/**
 * Build full page metadata with OpenGraph + Twitter card.
 * Uses the dynamic OG image route for content pages,
 * or the static og-image.png as fallback.
 *
 * `path` is the internal next-intl route path (e.g. '/changelog', '/domains/budget').
 * It is resolved to localized URLs for canonical and hreflang via getPathname.
 */
export function buildMetadata({
  locale,
  title,
  description,
  path,
  ogParams,
  localizedPaths,
  noindex,
  draft,
  absoluteTitle,
  availableLocales,
}: {
  locale: string;
  title: string;
  description: string;
  path?: string;
  ogParams?: string;
  /**
   * Per-locale path overrides for hreflang alternates. When provided, takes
   * precedence over `path` for the alternates mapping. Use case: dossiers
   * with localized slugs where each locale has a different URL slug
   * (spec 2026-05-03 §3.7).
   *
   * Example: { fr: '/dossiers/cpas-bruxellois', nl: '/dossiers/ocmw-brussel', ... }
   * The current locale's path is also used for the canonical URL.
   */
  localizedPaths?: Partial<Record<Locale, string>>;
  /**
   * If true, emit `<meta name="robots" content="noindex, follow">`. Used for
   * fallback locale pages (content rendered from FR while native translation
   * is missing) to avoid duplicate content penalty (spec 2026-05-03 §3.7).
   */
  noindex?: boolean;
  /**
   * If true, this is a `draft: true` card previewed at its URL for editorial
   * review (see components/draft-banner.tsx). Forces
   * `<meta name="robots" content="noindex, nofollow">` — stricter than
   * `noindex` above, which still lets crawlers follow outbound links. A draft
   * is unpublished: its outbound links (and hreflang alternates, see below)
   * should not be treated as an endorsed part of the site graph. Takes
   * precedence over `noindex` if both are set (most restrictive wins).
   *
   * Also drops the hreflang `languages` alternates entirely — no `languages`
   * key at all, not even a self-referencing one; only `alternates.canonical`
   * (the draft's own URL) remains. The published siblings a draft would
   * otherwise list as translations are not equivalents of unpublished,
   * unreviewed content — advertising them as such under the draft's hreflang
   * group would be incorrect even though the draft itself is noindexed, so
   * the group is dropped rather than narrowed.
   */
  draft?: boolean;
  /**
   * If true, `<title>` is `title` as is, without the ' | BGM' template of the
   * locale layout. For titles already written to fit search results (dossier
   * `seoTitle`). OpenGraph and Twitter always carry `title` without suffix.
   */
  absoluteTitle?: boolean;
  /**
   * Locales dans lesquelles la page existe RÉELLEMENT.
   *
   * Sans ce paramètre, la boucle des alternates retombe sur `path` pour toute
   * locale absente de `localizedPaths` et déclare donc un hreflang vers une URL
   * qui n'existe pas. Sur une collection entièrement traduite c'est sans
   * conséquence ; sur une collection partielle — les vérifications, dont deux
   * fiches sur quatre n'existent qu'en français et en néerlandais — cela
   * publierait un hreflang vers une 404.
   *
   * Or une annotation hreflang qui désigne une URL non-200 est invalide, et
   * Google peut ignorer tout le groupe. C'est exactement le défaut corrigé le
   * 21/09/2026 sur l'en-tête HTTP de next-intl : ne pas le réintroduire ici.
   */
  availableLocales?: Locale[];
}): Metadata {
  // Canonical URL: prefer localizedPaths override for current locale, else getPathname
  const currentLocalePath = localizedPaths?.[locale as Locale];
  const resolvedPath = currentLocalePath
    ? `/${locale}${currentLocalePath}`
    : path
      ? getPathname({ locale: locale as Locale, href: pathToHref(path) })
      : `/${locale}`;
  const url = `${siteUrl}${resolvedPath}`;

  const imageUrl = ogParams
    ? `${siteUrl}/${locale}/og?${ogParams}`
    : `${siteUrl}/${locale}/og?title=${encodeURIComponent(title)}`;

  const truncatedDescription = truncateDescription(description);

  // Build hreflang alternates: prefer localizedPaths per-locale, else getPathname
  const languages: Record<string, string> = {};
  const localesPubliees = availableLocales ?? routing.locales;
  for (const l of localesPubliees) {
    const localizedPath = localizedPaths?.[l];
    if (localizedPath) {
      languages[l] = `${siteUrl}/${l}${localizedPath}`;
    } else if (path) {
      languages[l] = `${siteUrl}${getPathname({ locale: l, href: pathToHref(path) })}`;
    } else {
      languages[l] = `${siteUrl}/${l}`;
    }
  }
  // x-default → French version (primary Brussels audience). Sur une collection
  // partielle où le français manquerait, on désigne la première langue publiée
  // plutôt qu'une URL inexistante.
  if (!localesPubliees.includes('fr')) {
    languages['x-default'] = languages[localesPubliees[0]];
  } else {
  const frPath = localizedPaths?.fr;
  languages['x-default'] = frPath
    ? `${siteUrl}/fr${frPath}`
    : path
      ? `${siteUrl}${getPathname({ locale: 'fr' as Locale, href: pathToHref(path) })}`
      : `${siteUrl}/fr`;
  }

  const robots = draft
    ? { index: false, follow: false }
    : noindex
      ? { index: false, follow: true }
      : undefined;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: truncatedDescription,
    ...(robots ? { robots } : {}),
    alternates: {
      canonical: url,
      // A draft drops the `languages` hreflang group entirely — no `languages`
      // key is emitted, not even a self-referencing one — since the published
      // siblings otherwise listed here are not equivalents of unpublished,
      // unreviewed content (see the `draft` param doc above).
      ...(draft ? {} : { languages }),
    },
    openGraph: {
      title,
      description: truncatedDescription,
      siteName,
      locale: ogLocaleMap[locale] || locale,
      type: 'website',
      url,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: truncatedDescription,
      images: [imageUrl],
    },
  };
}
