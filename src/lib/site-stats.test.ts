// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Les chiffres que le site annonce sur lui-même.
 *
 * Aucun nombre n'est figé ici : pages et sources bougent à chaque fiche et à
 * chaque source ajoutée. Les tests verrouillent l'ORIGINE des chiffres et des
 * invariants, pas leur valeur.
 *
 * Ne lit pas `.velite/` (absent en CI quand les tests unitaires tournent) : le
 * registre des sources est un fichier versionné, et le nombre de pages est
 * comparé au plan du site dans le même état de contenu, quel qu'il soit.
 */
import { describe, expect, it, vi } from 'vitest';
import sourceRegistry from '../../docs/source-registry.json';

// sitemap.ts résout ses chemins via next-intl, qui importe next/navigation et
// ne charge pas sous vitest (même remède que src/app/sitemap.test.ts). Le
// chemin exact n'importe pas ici, seul le nombre d'entrées compte.
vi.mock('@/i18n/navigation', () => ({
  getPathname: ({ locale, href }: { locale: string; href: unknown }) =>
    `/${locale}/${typeof href === 'string' ? href : JSON.stringify(href)}`,
}));

import sitemap from '@/app/sitemap';
import { routing } from '@/i18n/routing';
import { getEditorialSourceCount } from '@/lib/radar';
import { getSiteStats } from './site-stats';

function entierPositif(n: number) {
  expect(Number.isInteger(n), `${n} n'est pas un entier`).toBe(true);
  expect(n).toBeGreaterThan(0);
}

describe('getSiteStats', () => {
  const stats = getSiteStats();

  it('rend trois entiers positifs', () => {
    entierPositif(stats.pages);
    entierPositif(stats.sourcesSuivies);
    entierPositif(stats.langues);
  });

  it('reprend le compte de « Ce qu’on surveille » : les deux blocs de l’accueil ne peuvent pas diverger', () => {
    expect(stats.sourcesSuivies).toBe(getEditorialSourceCount());
  });

  it('compte les sources suivies par la veille, pas le registre entier', () => {
    // Le 323 écrit en dur était le total du registre (veille ET scan mensuel,
    // désactivées comprises) annoncé comme « surveillées ». Invariant : la
    // veille est un sous-ensemble strict du registre, qui contient des
    // sources du radar mensuel.
    const { sources } = sourceRegistry as { sources: { tier?: string; enabled?: boolean }[] };
    expect(sources.some((s) => s.tier === 'radar')).toBe(true);
    expect(stats.sourcesSuivies).toBeLessThan(sources.length);
    expect(stats.sourcesSuivies).toBeLessThan(
      sources.filter((s) => s.enabled !== false).length,
    );
  });

  it('compte les pages du plan du site', () => {
    expect(stats.pages).toBe(sitemap().length);
  });

  it('compte les langues du routage', () => {
    expect(stats.langues).toBe(routing.locales.length);
  });
});
