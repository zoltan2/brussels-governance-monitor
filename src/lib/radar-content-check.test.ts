// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * scripts/content-lint/data-schemas.ts appelle checkRadarPromotions() et
 * checkRadarCardSlugs() sur les vraies données ; ce fichier fixe leur
 * comportement sur des fixtures, indépendamment de data/radar.json et de
 * content/, pour rester rapide et stable d'une veille à l'autre.
 */
import { describe, expect, it } from 'vitest';
import type { PromotionSlugSets } from './radar';
import {
  checkRadarPromotions,
  checkRadarCardSlugs,
  type CardSlugSets,
} from './radar-content-check';

const SLUG_SETS: PromotionSlugSets = {
  domains: new Set(['mobility']),
  dossiers: new Set(['faillites-a-bruxelles']),
  communes: new Set(['bruxelles-ville']),
  sectors: new Set([]),
};

describe('checkRadarPromotions', () => {
  it('ne signale rien quand promotedSection est correct', () => {
    const violations = checkRadarPromotions(
      [{ id: 'a', promotedTo: 'mobility', promotedSection: 'domains' }],
      SLUG_SETS,
    );
    expect(violations).toEqual([]);
  });

  it('ne signale rien quand promotedSection est absent mais que la fiche est un domaine (repli implicite correct)', () => {
    const violations = checkRadarPromotions(
      [{ id: 'a', promotedTo: 'mobility' }],
      SLUG_SETS,
    );
    expect(violations).toEqual([]);
  });

  it('BUG DU 24/09/2026 : signale promotedSection absent quand la fiche est un dossier, pas un domaine', () => {
    const violations = checkRadarPromotions(
      [{ id: '2026-09-24-faillites-bruxelles-statbel-aout', promotedTo: 'faillites-a-bruxelles' }],
      SLUG_SETS,
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]!.id).toBe('2026-09-24-faillites-bruxelles-statbel-aout');
    expect(violations[0]!.message).toContain('dossiers');
  });

  it('signale une commune sans promotedSection', () => {
    const violations = checkRadarPromotions(
      [{ id: 'b', promotedTo: 'bruxelles-ville' }],
      SLUG_SETS,
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]!.message).toContain('communes');
  });

  it('CONTRADICTION : signale un promotedSection qui contredit le vrai type', () => {
    const violations = checkRadarPromotions(
      [{ id: 'c', promotedTo: 'faillites-a-bruxelles', promotedSection: 'domains' }],
      SLUG_SETS,
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]!.message).toContain('contredit');
    expect(violations[0]!.message).toContain('dossiers');
  });

  it('signale un promotedTo introuvable dans aucune collection', () => {
    const violations = checkRadarPromotions(
      [{ id: 'd', promotedTo: 'aucune-fiche-de-ce-nom' }],
      SLUG_SETS,
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]!.message).toContain('ne correspond à aucune fiche');
  });

  it('ignore les entrées sans promotedTo', () => {
    const violations = checkRadarPromotions([{ id: 'e', promotedTo: null }], SLUG_SETS);
    expect(violations).toEqual([]);
  });
});

describe('checkRadarCardSlugs', () => {
  const CARD_SETS: CardSlugSets = {
    domains: new Set(['mobility']),
    dossiers: new Set(['faillites-a-bruxelles']),
    communes: new Set(['bruxelles-ville']),
    sectors: new Set([]),
    comparisons: new Set(['formation-timeline']),
    solutions: new Set([]),
  };

  it('ne signale rien quand tous les slugs de cards[] existent', () => {
    const violations = checkRadarCardSlugs(
      [{ id: 'a', cards: ['mobility', 'faillites-a-bruxelles', 'formation-timeline'] }],
      CARD_SETS,
    );
    expect(violations).toEqual([]);
  });

  it('signale (sans lever) un slug de cards[] introuvable dans aucune collection', () => {
    const violations = checkRadarCardSlugs(
      [{ id: 'a', cards: ['mobility', 'fiche-fantome'] }],
      CARD_SETS,
    );
    expect(violations).toEqual([{ id: 'a', card: 'fiche-fantome' }]);
  });
});
