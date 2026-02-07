import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import {
  getAllDomainSlugs,
  getAllSolutionSlugs,
  getAllSectorSlugs,
  getAllComparisonSlugs,
} from '@/lib/content';
import type { Locale } from '@/i18n/routing';

type Href = Parameters<typeof getPathname>[0]['href'];

function localizedUrl(siteUrl: string, locale: Locale, href: Href): string {
  const pathname = getPathname({ locale, href });
  return `${siteUrl}/${locale}${pathname}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://brusselsgovernance.be';
  const locales = routing.locales;

  const staticPaths: Href[] = [
    '/',
    '/data',
    '/editorial',
    '/methodology',
    '/privacy',
    '/timeline',
    '/glossary',
    '/faq',
    '/legal',
    '/explainers/parliament-powers',
    '/explainers/brussels-paradox',
    '/explainers/government-formation',
    '/explainers/levels-of-power',
    '/comparisons',
  ];
  const domainSlugs = getAllDomainSlugs();
  const solutionSlugs = getAllSolutionSlugs();
  const sectorSlugs = getAllSectorSlugs();
  const comparisonSlugs = getAllComparisonSlugs();

  const entries: MetadataRoute.Sitemap = [];

  for (const href of staticPaths) {
    for (const locale of locales) {
      const isHome = href === '/';
      entries.push({
        url: localizedUrl(siteUrl, locale, href),
        lastModified: new Date(),
        changeFrequency: isHome ? 'daily' : 'weekly',
        priority: isHome ? 1.0 : 0.7,
      });
    }
  }

  for (const slug of domainSlugs) {
    for (const locale of locales) {
      entries.push({
        url: localizedUrl(siteUrl, locale, {
          pathname: '/domains/[slug]',
          params: { slug },
        }),
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  for (const slug of solutionSlugs) {
    for (const locale of locales) {
      entries.push({
        url: localizedUrl(siteUrl, locale, {
          pathname: '/solutions/[slug]',
          params: { slug },
        }),
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  for (const slug of sectorSlugs) {
    for (const locale of locales) {
      entries.push({
        url: localizedUrl(siteUrl, locale, {
          pathname: '/sectors/[slug]',
          params: { slug },
        }),
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  for (const slug of comparisonSlugs) {
    for (const locale of locales) {
      entries.push({
        url: localizedUrl(siteUrl, locale, {
          pathname: '/comparisons/[slug]',
          params: { slug },
        }),
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return entries;
}
