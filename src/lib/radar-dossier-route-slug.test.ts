// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * `localizeDossierRouteSlug` (et via elle, `localize()` / le champ
 * `promotedLink.slug` des signaux radar, src/lib/radar.ts) doit résoudre le
 * slug de ROUTE localisé du dossier promu, pas le slug canonique brut reçu
 * depuis `promotedTo` (data/radar.json) : sinon le lien « voir la fiche » du
 * radar, pour un dossier à slug NL distinct (ex. cpas-bruxellois →
 * brusselse-ocmws), pointerait vers l'ancienne adresse plutôt que la
 * directe. Voir PR #593.
 *
 * Ce site échappe au garde générique de src/lib/dossier-url-guard.test.ts :
 * son pathname est choisi dynamiquement via PROMOTED_SECTION_PATHNAME
 * (src/app/[locale]/radar/radar-content.tsx), pas le littéral
 * `/dossiers/[slug]` que ce garde reconnaît structurellement. D'où ce test
 * ciblé, distinct de radar.test.ts (qui teste les fonctions pures sans
 * dépendre de `@/lib/content`).
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/content', () => ({
  getDossierCard: (slug: string) =>
    slug === 'cpas-bruxellois'
      ? {
          card: { slug: 'cpas-bruxellois', localizedSlugs: { nl: 'brusselse-ocmws' } },
          isFallback: false,
        }
      : null,
  getLocalizedSlug: (
    card: { slug: string; localizedSlugs?: Record<string, string> },
    locale: string,
  ) => card.localizedSlugs?.[locale] ?? card.slug,
  getAllDomainSlugs: () => [],
  getAllDossierSlugs: () => [],
  getAllCommuneSlugs: () => [],
  getAllSectorSlugs: () => [],
}));

import { localizeDossierRouteSlug } from './radar';

describe('localizeDossierRouteSlug', () => {
  it('résout le slug de route localisé NL pour un dossier qui en a un', () => {
    expect(localizeDossierRouteSlug('cpas-bruxellois', 'nl')).toBe('brusselse-ocmws');
  });

  it('retombe sur le slug canonique pour une locale sans slug localisé (fr)', () => {
    expect(localizeDossierRouteSlug('cpas-bruxellois', 'fr')).toBe('cpas-bruxellois');
  });

  it('retombe sur le slug canonique si le dossier est introuvable (retiré depuis)', () => {
    expect(localizeDossierRouteSlug('dossier-disparu', 'nl')).toBe('dossier-disparu');
  });
});
