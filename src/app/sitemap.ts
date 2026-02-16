import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import {
  getAllDomainSlugs,
  getAllSectorSlugs,
  getAllComparisonSlugs,
  getAllCommuneSlugs,
  getAllDossierSlugs,
  getAllDigestWeeks,
  getAllDigestLangs,
} from '@/lib/content';
import type { Locale } from '@/i18n/routing';

type Href = Parameters<typeof getPathname>[0]['href'];

function localizedUrl(siteUrl: string, locale: Locale, href: Href): string {
  const pathname = getPathname({ locale, href });
  return `${siteUrl}${pathname}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';
  const locales = routing.locales;

  const staticPaths: Href[] = [
    '/',
    '/domains',
    '/sectors',
    '/comparisons',
    '/communes',
    '/dossiers',
    '/dashboard',
    '/understand',
    '/timeline',
    '/glossary',
    '/faq',
    '/explainers/brussels-overview',
    '/explainers/levels-of-power',
    '/explainers/government-formation',
    '/explainers/brussels-paradox',
    '/explainers/parliament-powers',
    '/explainers/brussels-cosmopolitan',
    '/explainers/brussels-region',
    '/explainers/cocom',
    '/explainers/cocof',
    '/explainers/vgc',
    '/explainers/communities-in-brussels',
    '/explainers/federal-and-brussels',
    '/explainers/who-decides-what',
    '/data',
    '/editorial',
    '/methodology',
    '/how-to-read',
    '/changelog',
    '/privacy',
    '/legal',
    '/transparency',
    '/accessibility',
  ];
  const domainSlugs = getAllDomainSlugs();
  const sectorSlugs = getAllSectorSlugs();
  const comparisonSlugs = getAllComparisonSlugs();
  const communeSlugs = getAllCommuneSlugs();
  const dossierSlugs = getAllDossierSlugs();

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

  // Solutions removed: all solution pages have robots: { index: false }

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

  for (const slug of communeSlugs) {
    for (const locale of locales) {
      entries.push({
        url: localizedUrl(siteUrl, locale, {
          pathname: '/communes/[slug]',
          params: { slug },
        }),
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  for (const slug of dossierSlugs) {
    for (const locale of locales) {
      entries.push({
        url: localizedUrl(siteUrl, locale, {
          pathname: '/dossiers/[slug]',
          params: { slug },
        }),
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  // Digest pages (outside locale routing — /digest/[lang]/[year]/[week])
  const digestWeeks = getAllDigestWeeks();
  const digestLangs = getAllDigestLangs();
  for (const week of digestWeeks) {
    // Parse week format "2026-w07" → year "2026", week "w07"
    const [year, w] = week.split('-');
    for (const lang of digestLangs) {
      entries.push({
        url: `${siteUrl}/digest/${lang}/${year}/${w}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    }
  }

  return entries;
}
