// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it, vi } from 'vitest';

// Mock next-intl/server before importing the page module
vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
}));

// Mock next/navigation notFound — throw a sentinel so we can detect calls
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

// Mock content lib
vi.mock('@/lib/content', () => ({
  getDossierCard: vi.fn((slug: string, locale: string) => {
    if (slug !== 'cpas-bruxellois') return null;
    if (locale === 'fr') {
      return {
        card: {
          slug: 'cpas-bruxellois',
          locale: 'fr',
          title: 'CPAS bruxellois',
          summary: 'summary text',
          lastModified: '2026-05-02',
          content: 'mdx content',
          metrics: [],
        },
        isFallback: false,
      };
    }
    // For other locales, return fr fallback (isFallback: true)
    return {
      card: {
        slug: 'cpas-bruxellois',
        locale: 'fr',
        title: 'CPAS bruxellois',
        summary: 'summary text',
        lastModified: '2026-05-02',
        content: 'mdx content',
        metrics: [],
      },
      isFallback: true,
    };
  }),
}));

// Routing mock — minimal locales
vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['fr', 'nl', 'en', 'de'] },
}));

describe('Scrolly page — generateStaticParams', () => {
  it('generates only allowlisted slug × native locale combinations', async () => {
    const { generateStaticParams } = await import('./page');
    const params = await generateStaticParams();
    // Only cpas-bruxellois × fr (the only native combo) should be present.
    expect(params).toEqual([{ locale: 'fr', slug: 'cpas-bruxellois' }]);
  });

  it('does NOT generate routes for fallback locales (NL/EN/DE for cpas)', async () => {
    const { generateStaticParams } = await import('./page');
    const params = await generateStaticParams();
    expect(params.find((p) => p.locale === 'nl')).toBeUndefined();
    expect(params.find((p) => p.locale === 'en')).toBeUndefined();
    expect(params.find((p) => p.locale === 'de')).toBeUndefined();
  });
});

describe('Scrolly page — generateMetadata', () => {
  it('returns noindex + canonical to structured page for allowlisted dossier', async () => {
    const { generateMetadata } = await import('./page');
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: 'fr', slug: 'cpas-bruxellois' }),
    });
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.alternates?.canonical).toBe(
      'https://governance.brussels/fr/dossiers/cpas-bruxellois',
    );
  });

  it('returns empty metadata for non-allowlisted slug', async () => {
    const { generateMetadata } = await import('./page');
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: 'fr', slug: 'bim-bruxelles' }),
    });
    expect(meta).toEqual({});
  });

  it('returns empty metadata for fallback locale (no native MDX)', async () => {
    const { generateMetadata } = await import('./page');
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: 'nl', slug: 'cpas-bruxellois' }),
    });
    expect(meta).toEqual({});
  });
});
