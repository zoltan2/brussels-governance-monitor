import type { Metadata } from 'next';
import { getPathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const siteName = 'Brussels Governance Monitor';

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
}: {
  locale: string;
  title: string;
  description: string;
  path?: string;
  ogParams?: string;
}): Metadata {
  // Resolve canonical URL using localized pathnames
  const resolvedPath = path
    ? getPathname({ locale: locale as Locale, href: pathToHref(path) })
    : `/${locale}`;
  const url = `${siteUrl}${resolvedPath}`;

  const imageUrl = ogParams
    ? `${siteUrl}/${locale}/og?${ogParams}`
    : `${siteUrl}/${locale}/og?title=${encodeURIComponent(title)}`;

  const truncatedDescription =
    description.length > 160 ? description.slice(0, 157) + '...' : description;

  // Build hreflang alternates for all locales + x-default
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    if (path) {
      languages[l] = `${siteUrl}${getPathname({ locale: l, href: pathToHref(path) })}`;
    } else {
      languages[l] = `${siteUrl}/${l}`;
    }
  }
  // x-default → French version (primary Brussels audience)
  languages['x-default'] = path
    ? `${siteUrl}${getPathname({ locale: 'fr' as Locale, href: pathToHref(path) })}`
    : `${siteUrl}/fr`;

  return {
    title,
    description: truncatedDescription,
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      title,
      description: truncatedDescription,
      siteName,
      locale,
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
