// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Un dossier ou une fiche domaine en `draft: true` reste PRÉ-RENDU et servi
 * à son URL (relecture éditoriale, voir src/components/draft-banner.tsx),
 * mais ne doit jamais apparaître dans le sitemap : Google ne doit pas être
 * invité à le découvrir. Ce fichier mocke `@/lib/content` (au lieu de
 * dépendre de la sortie Velite comme src/app/sitemap.test.ts) pour tester ce
 * cas précis, y compris son absence dans les fixtures de contenu réelles.
 */
import { describe, expect, it, vi } from 'vitest';

// Même remède que src/app/sitemap.test.ts : getPathname importe next/navigation,
// qui ne charge pas sous vitest. Mock minimal, fidèle au comportement réel pour
// les hrefs utilisés ici (chaîne ou { pathname, params }).
vi.mock('@/i18n/navigation', () => ({
  getPathname: ({ locale, href }: { locale: string; href: unknown }) => {
    if (typeof href === 'string') return `/${locale}${href}`;
    if (href && typeof href === 'object' && 'pathname' in href) {
      let pathname = (href as { pathname: string }).pathname;
      const params = (href as { params?: Record<string, string> }).params ?? {};
      for (const [key, value] of Object.entries(params)) {
        pathname = pathname.replace(`[${key}]`, value);
      }
      return `/${locale}${pathname}`;
    }
    throw new Error(`Href inattendu dans le mock de getPathname : ${JSON.stringify(href)}`);
  },
}));

interface FixtureCard {
  slug: string;
  draft: boolean;
  lastModified: string;
  localizedSlugs?: Record<string, string>;
}

const dossiers: Record<string, FixtureCard> = {
  'dossier-publie': { slug: 'dossier-publie', draft: false, lastModified: '2026-09-01' },
  'dossier-brouillon': { slug: 'dossier-brouillon', draft: true, lastModified: '2026-09-01' },
};

const domains: Record<string, FixtureCard> = {
  'domaine-publie': { slug: 'domaine-publie', draft: false, lastModified: '2026-09-01' },
  'domaine-brouillon': { slug: 'domaine-brouillon', draft: true, lastModified: '2026-09-01' },
};

vi.mock('@/lib/content', () => ({
  getVerification: () => null,
  getVerificationSlugs: () => [],
  getVerificationLocales: () => [],
  getAllDomainSlugs: () => Object.keys(domains),
  getAllSectorSlugs: () => [],
  getAllComparisonSlugs: () => [],
  getAllCommuneSlugs: () => [],
  getAllDossierSlugs: () => Object.keys(dossiers),
  getAllArchiveSlugs: () => [],
  getAllDigestWeeks: () => [],
  getAllDigestLangs: () => [],
  getDigestEntry: () => null,
  isIndexableDigestEdition: () => false,
  getDomainCard: (slug: string) =>
    domains[slug] ? { card: domains[slug], isFallback: false } : null,
  getSectorCard: () => null,
  getComparisonCard: () => null,
  getCommuneCard: () => null,
  getDossierCard: (slug: string) =>
    dossiers[slug] ? { card: dossiers[slug], isFallback: false } : null,
  getLocalizedSlug: (card: FixtureCard, locale: string) => card.localizedSlugs?.[locale] ?? card.slug,
  getArchivePage: () => null,
}));

async function buildSitemap() {
  const { default: sitemap } = await import('./sitemap');
  return sitemap();
}

describe('sitemap() — brouillons', () => {
  it('un dossier brouillon est absent du sitemap (aucune locale) ; le dossier publié y est, dans les 4', async () => {
    const entries = await buildSitemap();
    const urls = entries.map((e) => e.url);

    expect(urls.some((u) => u.includes('/dossiers/dossier-brouillon'))).toBe(false);

    const publieUrls = urls.filter((u) => u.includes('/dossiers/dossier-publie'));
    expect(publieUrls).toHaveLength(4); // fr, nl, en, de
  });

  it('une fiche domaine brouillon est absente du sitemap ; la fiche publiée y est', async () => {
    const entries = await buildSitemap();
    const urls = entries.map((e) => e.url);

    expect(urls.some((u) => u.includes('/domains/domaine-brouillon') || u.includes('/domaines/domaine-brouillon'))).toBe(false);

    const publieUrls = urls.filter(
      (u) => u.includes('/domains/domaine-publie') || u.includes('/domaines/domaine-publie'),
    );
    expect(publieUrls.length).toBeGreaterThan(0);
  });

  /**
   * PREUVE DE MUTATION : si le garde `if (card.draft) continue` de la
   * boucle Dossiers (src/app/sitemap.ts) disparaissait ou était inversé, ce
   * test échouerait — soit le brouillon apparaîtrait, soit le publié
   * disparaîtrait. Les deux assertions ci-dessus portent ensemble sur les
   * deux issues possibles d'une régression du garde.
   */
  it('mutation : le total de dossiers dans le sitemap est exactement 4 (le publié × 4 locales, pas le brouillon)', async () => {
    const entries = await buildSitemap();
    const dossierUrls = entries.filter((e) => e.url.includes('/dossiers/dossier-'));
    expect(dossierUrls).toHaveLength(4);
  });
});
