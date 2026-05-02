// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Velite collections — each test sets its own dossierCards fixture
const mockGetCollections = vi.fn();
vi.mock('@/.velite', () => ({
  get dossierCards() {
    return mockGetCollections().dossierCards;
  },
  get domainCards() {
    return [];
  },
  get solutionCards() {
    return [];
  },
  get formationRounds() {
    return [];
  },
  get formationEvents() {
    return [];
  },
  get governmentChapters() {
    return [];
  },
  get glossaryTerms() {
    return [];
  },
  get verifications() {
    return [];
  },
  get sectorCards() {
    return [];
  },
  get comparisonCards() {
    return [];
  },
  get communeCards() {
    return [];
  },
  get digestEntries() {
    return [];
  },
  get archivePages() {
    return [];
  },
}));

// Helper to build a minimal DossierCard fixture
const makeDossier = (overrides: Record<string, unknown>) => ({
  title: 'Test',
  slug: 'test',
  locale: 'fr',
  dossierType: 'social',
  phase: 'in-progress',
  crisisImpact: 'reduced',
  decisionLevel: 'mixed',
  summary: 'summary',
  stakeholders: [],
  relatedDomains: [],
  relatedSectors: [],
  relatedCommunes: [],
  relatedFormationEvents: [],
  sources: [],
  metrics: [],
  alerts: [],
  confidenceLevel: 'official',
  lastModified: '2026-05-03',
  draft: false,
  content: '',
  permalink: '/dossiers/test',
  ...overrides,
});

describe('getLocalizedSlug', () => {
  it('returns localizedSlugs[locale] when present', async () => {
    const { getLocalizedSlug } = await import('./content');
    const card = makeDossier({
      slug: 'cpas-bruxellois',
      localizedSlugs: { nl: 'ocmw-brussel' },
    });
    expect(getLocalizedSlug(card as never, 'nl')).toBe('ocmw-brussel');
  });

  it('falls back to slug when localizedSlugs[locale] absent', async () => {
    const { getLocalizedSlug } = await import('./content');
    const card = makeDossier({
      slug: 'cpas-bruxellois',
      localizedSlugs: { nl: 'ocmw-brussel' },
    });
    // EN not in localizedSlugs → fallback
    expect(getLocalizedSlug(card as never, 'en')).toBe('cpas-bruxellois');
  });

  it('falls back to slug when localizedSlugs is entirely absent (retro-compat)', async () => {
    const { getLocalizedSlug } = await import('./content');
    const card = makeDossier({ slug: 'bim-bruxelles' });
    expect(getLocalizedSlug(card as never, 'fr')).toBe('bim-bruxelles');
    expect(getLocalizedSlug(card as never, 'nl')).toBe('bim-bruxelles');
    expect(getLocalizedSlug(card as never, 'en')).toBe('bim-bruxelles');
    expect(getLocalizedSlug(card as never, 'de')).toBe('bim-bruxelles');
  });
});

describe('findDossierByLocalizedSlug (pure)', () => {
  it('finds native dossier when locale matches and effective slug matches localizedSlug', async () => {
    const { findDossierByLocalizedSlug } = await import('./content');
    const dossiers = [
      makeDossier({ slug: 'cpas-bruxellois', locale: 'nl', localizedSlugs: { nl: 'ocmw-brussel' } }),
    ];
    const result = findDossierByLocalizedSlug(dossiers as never, 'ocmw-brussel', 'nl');
    expect(result).not.toBeNull();
    expect(result?.card.slug).toBe('cpas-bruxellois');
    expect(result?.isFallback).toBe(false);
  });

  it('falls back to FR when no native locale exists', async () => {
    const { findDossierByLocalizedSlug } = await import('./content');
    const dossiers = [
      makeDossier({ slug: 'cpas-bruxellois', locale: 'fr' }),
    ];
    const result = findDossierByLocalizedSlug(dossiers as never, 'cpas-bruxellois', 'nl');
    expect(result).not.toBeNull();
    expect(result?.card.slug).toBe('cpas-bruxellois');
    expect(result?.isFallback).toBe(true);
  });

  it('returns null when slug matches nothing', async () => {
    const { findDossierByLocalizedSlug } = await import('./content');
    const dossiers = [makeDossier({ slug: 'bim-bruxelles', locale: 'fr' })];
    expect(findDossierByLocalizedSlug(dossiers as never, 'non-existant', 'fr')).toBeNull();
  });

  it('returns same result as direct slug+locale lookup for card without localizedSlugs (regression check)', async () => {
    // User-flagged regression risk: when localizedSlugs is absent and the URL
    // slug equals the canonical slug, the localized lookup MUST return the
    // same card as a direct (slug, locale) lookup. C'est exactement le
    // comportement de getDossierCard pour les 22 dossiers existants.
    const { findDossierByLocalizedSlug } = await import('./content');
    const dossiers = [
      makeDossier({ slug: 'bim-bruxelles', locale: 'fr' }), // pas de localizedSlugs
    ];

    const direct = (dossiers as never[]).find(
      (c: { slug: string; locale: string }) => c.slug === 'bim-bruxelles' && c.locale === 'fr',
    );
    const byLocalized = findDossierByLocalizedSlug(dossiers as never, 'bim-bruxelles', 'fr');

    expect(direct).toBeDefined();
    expect(byLocalized).not.toBeNull();
    expect(byLocalized?.card).toBe(direct);
    expect(byLocalized?.isFallback).toBe(false);
  });

  it('handles a dossier with localizedSlugs.fr matching slug (no-op localizedSlug)', async () => {
    // Cas où localizedSlugs.fr === slug (redondant mais valide).
    const { findDossierByLocalizedSlug } = await import('./content');
    const dossiers = [
      makeDossier({
        slug: 'cpas-bruxellois',
        locale: 'fr',
        localizedSlugs: { fr: 'cpas-bruxellois' },
      }),
    ];
    const result = findDossierByLocalizedSlug(dossiers as never, 'cpas-bruxellois', 'fr');
    expect(result?.card.slug).toBe('cpas-bruxellois');
    expect(result?.isFallback).toBe(false);
  });
});

describe('validateLocalizedSlugs', () => {
  beforeEach(() => {
    mockGetCollections.mockReset();
    // Reset the memoization flag by re-importing fresh module
    vi.resetModules();
  });

  it('passes when no collisions', async () => {
    mockGetCollections.mockReturnValue({
      dossierCards: [
        makeDossier({ slug: 'cpas-bruxellois', locale: 'nl', localizedSlugs: { nl: 'ocmw-brussel' } }),
        makeDossier({ slug: 'bim-bruxelles', locale: 'nl', localizedSlugs: { nl: 'rvv-brussel' } }),
      ],
    });
    const { validateLocalizedSlugs } = await import('./content');
    const dossiers = mockGetCollections().dossierCards;
    expect(() => validateLocalizedSlugs(dossiers)).not.toThrow();
  });

  it('throws on collision (two dossiers with same effective slug in same locale)', async () => {
    mockGetCollections.mockReturnValue({
      dossierCards: [
        makeDossier({ slug: 'a', locale: 'nl', localizedSlugs: { nl: 'shared-slug' } }),
        makeDossier({ slug: 'b', locale: 'nl', localizedSlugs: { nl: 'shared-slug' } }),
      ],
    });
    const { validateLocalizedSlugs } = await import('./content');
    const dossiers = mockGetCollections().dossierCards;
    expect(() => validateLocalizedSlugs(dossiers)).toThrow(/Collision dans la locale "nl"/);
  });

  it('does not throw when same effective slug appears in different locales (FR + NL)', async () => {
    mockGetCollections.mockReturnValue({
      dossierCards: [
        makeDossier({ slug: 'cpas-bruxellois', locale: 'fr' }),
        makeDossier({ slug: 'cpas-bruxellois', locale: 'nl' }),
      ],
    });
    const { validateLocalizedSlugs } = await import('./content');
    const dossiers = mockGetCollections().dossierCards;
    expect(() => validateLocalizedSlugs(dossiers)).not.toThrow();
  });
});
