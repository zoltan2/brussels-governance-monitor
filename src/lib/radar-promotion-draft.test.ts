// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * `getContentPromotionSlugSets()` (src/lib/radar.ts) doit construire ses
 * ensembles de slugs à partir des fiches PUBLIÉES uniquement : un signal du
 * radar qui promeut vers une fiche encore en brouillon ne doit produire
 * aucun lien (`resolvePromotedLink` rend `null`, faute de correspondance),
 * pas un lien vers une page hors sitemap et non indexée. `getPublished*Cards`
 * (src/lib/content.ts) filtre déjà `!c.draft` ; ce test prouve que le radar
 * s'appuie bien dessus et non sur les `getAll*Slugs` (qui incluent les
 * brouillons, à dessein, pour `generateStaticParams`).
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/content', () => ({
  getPublishedDomainCards: () => [{ slug: 'mobility', draft: false }],
  getPublishedDossierCards: () => [{ slug: 'dossier-publie', draft: false }],
  getPublishedCommuneCards: () => [{ slug: 'bruxelles-ville', draft: false }],
  getPublishedSectorCards: () => [{ slug: 'education', draft: false }],
  getDossierCard: () => null,
  getLocalizedSlug: (card: { slug: string }) => card.slug,
}));

import { getContentPromotionSlugSets, resolvePromotedLink } from './radar';

describe('getContentPromotionSlugSets', () => {
  it('exclut un brouillon : promotedTo vers une fiche draft ne rend aucun lien', () => {
    const sets = getContentPromotionSlugSets();
    // Le mock ne renvoie que des fiches publiées : un slug de brouillon
    // hypothétique ('dossier-brouillon') n'apparaît dans aucun ensemble.
    expect(resolvePromotedLink('dossier-brouillon', undefined, sets)).toBeNull();
  });

  it('résout normalement une fiche publiée', () => {
    const sets = getContentPromotionSlugSets();
    expect(resolvePromotedLink('dossier-publie', undefined, sets)).toEqual({
      section: 'dossiers',
      slug: 'dossier-publie',
    });
  });
});
