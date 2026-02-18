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

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';
const locales = routing.locales;

function localizedUrl(locale: Locale, href: Href): string {
  const pathname = getPathname({ locale, href });
  return `${siteUrl}${pathname}`;
}

/**
 * Build hreflang alternates for a given href across all locales.
 * Includes x-default pointing to the French version (primary audience).
 */
function buildAlternates(href: Href): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = localizedUrl(locale, href);
  }
  // x-default → French version (primary Brussels audience)
  languages['x-default'] = localizedUrl('fr' as Locale, href);
  return languages;
}

/**
 * Create one sitemap entry per locale for a given href, each with
 * hreflang alternates pointing to all other language versions.
 */
function addLocalizedEntries(
  entries: MetadataRoute.Sitemap,
  href: Href,
  options: { changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }
) {
  const alternates = buildAlternates(href);
  for (const locale of locales) {
    entries.push({
      url: localizedUrl(locale, href),
      lastModified: new Date(),
      changeFrequency: options.changeFrequency,
      priority: options.priority,
      alternates: { languages: alternates },
    });
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // ── Static pages ──────────────────────────────────────────────
  const staticPaths: { href: Href; priority?: number; changeFrequency?: 'daily' | 'weekly' }[] = [
    { href: '/', priority: 1.0, changeFrequency: 'daily' },
    { href: '/domains' },
    { href: '/sectors' },
    { href: '/comparisons' },
    { href: '/communes' },
    { href: '/dossiers' },
    { href: '/dashboard' },
    { href: '/understand' },
    { href: '/timeline' },
    { href: '/glossary' },
    { href: '/faq' },
    { href: '/explainers/brussels-overview' },
    { href: '/explainers/levels-of-power' },
    { href: '/explainers/government-formation' },
    { href: '/explainers/brussels-paradox' },
    { href: '/explainers/parliament-powers' },
    { href: '/explainers/brussels-cosmopolitan' },
    { href: '/explainers/brussels-region' },
    { href: '/explainers/cocom' },
    { href: '/explainers/cocof' },
    { href: '/explainers/vgc' },
    { href: '/explainers/communities-in-brussels' },
    { href: '/explainers/federal-and-brussels' },
    { href: '/explainers/who-decides-what' },
    { href: '/data' },
    { href: '/editorial' },
    { href: '/methodology' },
    { href: '/how-to-read' },
    { href: '/changelog' },
    { href: '/privacy' },
    { href: '/legal' },
    { href: '/transparency' },
    { href: '/accessibility' },
    { href: '/about' },
  ];

  for (const { href, priority, changeFrequency } of staticPaths) {
    addLocalizedEntries(entries, href, {
      changeFrequency: changeFrequency ?? 'weekly',
      priority: priority ?? 0.7,
    });
  }

  // ── Domains ───────────────────────────────────────────────────
  for (const slug of getAllDomainSlugs()) {
    addLocalizedEntries(
      entries,
      { pathname: '/domains/[slug]', params: { slug } },
      { changeFrequency: 'weekly', priority: 0.8 }
    );
  }

  // ── Sectors ───────────────────────────────────────────────────
  for (const slug of getAllSectorSlugs()) {
    addLocalizedEntries(
      entries,
      { pathname: '/sectors/[slug]', params: { slug } },
      { changeFrequency: 'weekly', priority: 0.7 }
    );
  }

  // ── Comparisons ───────────────────────────────────────────────
  for (const slug of getAllComparisonSlugs()) {
    addLocalizedEntries(
      entries,
      { pathname: '/comparisons/[slug]', params: { slug } },
      { changeFrequency: 'weekly', priority: 0.7 }
    );
  }

  // ── Communes ──────────────────────────────────────────────────
  for (const slug of getAllCommuneSlugs()) {
    addLocalizedEntries(
      entries,
      { pathname: '/communes/[slug]', params: { slug } },
      { changeFrequency: 'weekly', priority: 0.7 }
    );
  }

  // ── Dossiers ──────────────────────────────────────────────────
  for (const slug of getAllDossierSlugs()) {
    addLocalizedEntries(
      entries,
      { pathname: '/dossiers/[slug]', params: { slug } },
      { changeFrequency: 'weekly', priority: 0.7 }
    );
  }

  // ── Digest pages (outside locale routing) ─────────────────────
  // These don't use the i18n routing system, so no hreflang alternates.
  const digestWeeks = getAllDigestWeeks();
  const digestLangs = getAllDigestLangs();
  for (const week of digestWeeks) {
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