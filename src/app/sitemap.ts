import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getAllDomainSlugs, getAllSolutionSlugs } from '@/lib/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://brusselsgovernance.be';
  const locales = routing.locales;

  const staticPaths = ['', '/data', '/editorial', '/privacy', '/timeline', '/glossary', '/faq', '/legal'];
  const domainSlugs = getAllDomainSlugs();
  const solutionSlugs = getAllSolutionSlugs();

  const entries: MetadataRoute.Sitemap = [];

  for (const path of staticPaths) {
    for (const locale of locales) {
      entries.push({
        url: `${siteUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 1.0 : 0.7,
      });
    }
  }

  for (const slug of domainSlugs) {
    for (const locale of locales) {
      entries.push({
        url: `${siteUrl}/${locale}/domains/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  for (const slug of solutionSlugs) {
    for (const locale of locales) {
      entries.push({
        url: `${siteUrl}/${locale}/solutions/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  return entries;
}
