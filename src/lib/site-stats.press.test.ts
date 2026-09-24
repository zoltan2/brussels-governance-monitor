// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * « En bref » de la page Presse & données : tous les chiffres viennent des
 * comptes existants, aucun n'est recalculé ni écrit en dur. Sources simulées,
 * sans `.velite/`, avec des tailles arbitraires qui ne ressemblent à aucun
 * chiffre réel.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/sitemap', () => ({ default: () => new Array(731).fill({ url: 'x' }) }));
vi.mock('@/lib/radar', () => ({ getEditorialSourceCount: () => 617 }));
vi.mock('@/lib/content', () => ({
  getDossierCards: (locale: string) => (locale === 'fr' ? new Array(41).fill({}) : []),
  getDomainCards: (locale: string) => (locale === 'fr' ? new Array(82).fill({}) : []),
}));

import { routing } from '@/i18n/routing';
import { getPressStats, getSiteStats } from './site-stats';

describe('getPressStats', () => {
  it('reprend les chiffres de l’accueil et les listes publiées de dossiers et de domaines', () => {
    expect(getPressStats()).toEqual({
      pages: 731,
      sourcesSuivies: 617,
      langues: routing.locales.length,
      dossiers: 41,
      domaines: 82,
    });
  });

  it('ne diverge pas de getSiteStats sur les chiffres communs', () => {
    const { pages, sourcesSuivies, langues } = getPressStats();
    expect({ pages, sourcesSuivies, langues }).toEqual(getSiteStats());
  });
});
