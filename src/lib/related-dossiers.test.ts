// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { selectRelatedDossiers, RELATED_DOSSIERS_MAX } from './related-dossiers';

const dossier = (
  slug: string,
  relatedDomains: string[],
  lastModified: string,
  draft = false,
) => ({ slug, relatedDomains, lastModified, draft });

const current = { slug: 'lez', relatedDomains: ['mobility', 'climate'] };

describe('selectRelatedDossiers', () => {
  const candidates = [
    dossier('lez', ['mobility', 'climate'], '2026-09-18'),
    dossier('metro-3', ['mobility'], '2026-09-01'),
    dossier('good-move', ['mobility'], '2026-09-10'),
    dossier('rechauffement-bruxelles', ['climate'], '2026-09-15'),
    dossier('mobilite-partagee', ['mobility'], '2026-08-20'),
    dossier('cpas-bruxellois', ['social'], '2026-09-19'),
    dossier('brouillon', ['mobility'], '2026-09-19', true),
  ];

  it('keeps dossiers sharing a domain, most recently modified first, three at most', () => {
    const out = selectRelatedDossiers(current, candidates);
    expect(out.map((d) => d.slug)).toEqual(['rechauffement-bruxelles', 'good-move', 'metro-3']);
    expect(out).toHaveLength(RELATED_DOSSIERS_MAX);
  });

  it('ranks a dossier sharing two domains ahead of a more recent one sharing only one', () => {
    const out = selectRelatedDossiers(current, [
      dossier('recent-un-domaine', ['mobility'], '2026-09-19'),
      dossier('ancien-deux-domaines', ['climate', 'mobility'], '2026-01-01'),
      dossier('recent-hors-sujet', ['security'], '2026-09-19'),
    ]);
    expect(out.map((d) => d.slug)).toEqual(['ancien-deux-domaines', 'recent-un-domaine']);
  });

  it('never returns the current dossier, a draft or a dossier without a shared domain', () => {
    const slugs = selectRelatedDossiers(current, candidates, 10).map((d) => d.slug);
    expect(slugs).not.toContain('lez');
    expect(slugs).not.toContain('brouillon');
    expect(slugs).not.toContain('cpas-bruxellois');
    expect(slugs).toHaveLength(4);
  });

  it('breaks date ties on the slug so two builds render the same block', () => {
    const tied = [
      dossier('b-dossier', ['mobility'], '2026-09-01'),
      dossier('a-dossier', ['mobility'], '2026-09-01'),
    ];
    expect(selectRelatedDossiers(current, tied).map((d) => d.slug)).toEqual(['a-dossier', 'b-dossier']);
  });

  it('returns nothing for a dossier without domain', () => {
    expect(selectRelatedDossiers({ slug: 'x', relatedDomains: [] }, candidates)).toEqual([]);
  });

  it('lets a relatedDossiers list override the automatic choice, in its own order', () => {
    const out = selectRelatedDossiers(
      { ...current, relatedDossiers: ['cpas-bruxellois', 'mobilite-partagee'] },
      candidates,
    );
    expect(out.map((d) => d.slug)).toEqual(['cpas-bruxellois', 'mobilite-partagee']);
  });

  it('drops unknown, draft, duplicate and self slugs from relatedDossiers and caps it', () => {
    const out = selectRelatedDossiers(
      {
        ...current,
        relatedDossiers: ['inconnu', 'lez', 'brouillon', 'metro-3', 'metro-3', 'good-move', 'cpas-bruxellois', 'mobilite-partagee'],
      },
      candidates,
    );
    expect(out.map((d) => d.slug)).toEqual(['metro-3', 'good-move', 'cpas-bruxellois']);
  });

  it('keeps relatedDossiers first even over dossiers sharing more domains', () => {
    const out = selectRelatedDossiers(
      { ...current, relatedDossiers: ['cpas-bruxellois'] },
      [...candidates, dossier('deux-domaines', ['mobility', 'climate'], '2026-09-19')],
    );
    expect(out.map((d) => d.slug)).toEqual(['cpas-bruxellois']);
  });

  it('falls back to the automatic choice when relatedDossiers is empty', () => {
    const out = selectRelatedDossiers({ ...current, relatedDossiers: [] }, candidates);
    expect(out.map((d) => d.slug)).toEqual(['rechauffement-bruxelles', 'good-move', 'metro-3']);
  });
});
