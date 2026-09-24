// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * « Trois informations prêtes à citer » : la configuration ne porte que des
 * slugs, et le chiffre vient toujours de la fiche. Ne lit pas `.velite/` :
 * la résolution est éprouvée sur des fiches synthétiques, l'existence des
 * slugs sur le frontmatter brut de `content/`.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readGuardFrontmatter } from './frontmatter';

const fiches = vi.hoisted(() => ({
  domain: new Map<string, unknown>(),
  dossier: new Map<string, unknown>(),
}));

vi.mock('@/lib/content', () => ({
  getDomainCard: (slug: string) => (fiches.domain.has(slug) ? { card: fiches.domain.get(slug), isFallback: false } : null),
  getDossierCard: (slug: string) =>
    fiches.dossier.has(slug) ? { card: fiches.dossier.get(slug), isFallback: false } : null,
  getLocalizedSlug: (card: { slug: string; localizedSlugs?: Record<string, string> }, locale: string) =>
    card.localizedSlugs?.[locale] ?? card.slug,
}));

import { PRESS_READY_FACTS, getPressFacts, pressFactFigure, pressFactPath, resolvePressFact } from './press-facts';

const metrique = (value: string, extra: Record<string, unknown> = {}) => ({
  label: 'Libellé',
  value,
  unit: 'unités',
  source: 'Source officielle X',
  url: 'https://example.org/doc',
  date: '2026-09-11T00:00:00.000Z',
  bgmAlert: false,
  proofSources: [],
  revisions: [],
  ...extra,
});

beforeEach(() => {
  fiches.domain.clear();
  fiches.dossier.clear();
});

describe('PRESS_READY_FACTS', () => {
  it('ne contient que des références (collection, slug), jamais de valeur', () => {
    expect(PRESS_READY_FACTS).toHaveLength(3);
    for (const ref of PRESS_READY_FACTS) expect(Object.keys(ref).sort()).toEqual(['collection', 'slug']);
    const cles = PRESS_READY_FACTS.map((r) => `${r.collection}:${r.slug}`);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it.each(PRESS_READY_FACTS.map((r) => [r.collection, r.slug]))(
    '%s/%s existe dans content/ en quatre langues, publié, officiel, avec un chiffre clé',
    (collection, slug) => {
      const dossier = collection === 'domain' ? 'domain-cards' : 'dossiers';
      for (const l of ['fr', 'nl', 'en', 'de']) {
        const chemin = join(process.cwd(), 'content', dossier, `${slug}.${l}.mdx`);
        expect(existsSync(chemin), chemin).toBe(true);
        const fm = readGuardFrontmatter(readFileSync(chemin, 'utf8'));
        expect(fm, chemin).not.toBeNull();
        expect(fm?.draft === true, `${chemin} est un brouillon`).toBe(false);
        expect(Array.isArray(fm?.metrics) && (fm?.metrics as unknown[]).length > 0, chemin).toBe(true);
        expect(fm?.confidenceLevel, chemin).toBe('official');
      }
    },
  );
});

describe('resolvePressFact', () => {
  it('reprend le premier chiffre de la fiche, sa source et la confiance de la fiche', () => {
    fiches.dossier.set('lez', {
      slug: 'lez',
      title: 'Zone de basses émissions',
      shortTitle: 'LEZ',
      draft: false,
      confidenceLevel: 'official',
      localizedSlugs: { nl: 'lez-nl' },
      metrics: [metrique('4 321'), metrique('999')],
    });
    const f = resolvePressFact({ collection: 'dossier', slug: 'lez' }, 'nl');
    expect(f).toMatchObject({
      collection: 'dossier',
      slug: 'lez',
      routeSlug: 'lez-nl',
      pageTitle: 'LEZ',
      value: '4 321',
      unit: 'unités',
      source: 'Source officielle X',
      sourceUrl: 'https://example.org/doc',
      confidence: 'official',
    });
    // L'horodatage de Velite ramené au jour.
    expect(f?.date).toBe('2026-09-11');
    expect(pressFactPath(f!)).toBe('/dossiers/lez-nl');
    expect(pressFactFigure(f!)).toBe('4 321 unités');
  });

  it('résout une fiche domaine vers /domains/', () => {
    fiches.domain.set('budget', {
      slug: 'budget',
      title: 'Budget',
      draft: false,
      confidenceLevel: 'estimated',
      metrics: [metrique('957', { unit: undefined, url: undefined })],
    });
    const f = resolvePressFact({ collection: 'domain', slug: 'budget' }, 'fr');
    expect(f).toMatchObject({ routeSlug: 'budget', confidence: 'estimated', unit: null, sourceUrl: null });
    expect(pressFactPath(f!)).toBe('/domains/budget');
    expect(pressFactFigure(f!)).toBe('957');
  });

  it('écarte une fiche absente, en brouillon ou sans chiffre clé', () => {
    fiches.dossier.set('brouillon', { slug: 'brouillon', title: 'B', draft: true, confidenceLevel: 'official', metrics: [metrique('1')] });
    fiches.dossier.set('vide', { slug: 'vide', title: 'V', draft: false, confidenceLevel: 'official', metrics: [] });
    const refs = [
      { collection: 'dossier' as const, slug: 'absent' },
      { collection: 'dossier' as const, slug: 'brouillon' },
      { collection: 'dossier' as const, slug: 'vide' },
    ];
    expect(getPressFacts('fr', refs)).toEqual([]);
  });
});
