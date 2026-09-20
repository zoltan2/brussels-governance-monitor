// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * « Qu'est-ce qui mérite d'être relu ? » L'écran /review listait les fiches
 * draft: true, toujours vide. Cette page assemble trois signaux (pages IA
 * périmées, FAQ en retard, chapeaux périmés) puis, en second bloc, la
 * relecture des brouillons héritée de l'ancienne page.
 *
 * `getTranslations` est mocké pour renvoyer `${namespace}.${clé}` (plus les
 * valeurs passées en JSON quand il y en a) : ces tests vérifient la
 * structure et le branchement des données, pas le texte français lui-même
 * (couvert par la validité des fichiers messages/*.json).
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireAdmin = vi.fn().mockResolvedValue(undefined);
const chargerElementsARelire = vi.fn();
const getDraftCards = vi.fn();
const signOut = vi.fn();

vi.mock('@/lib/require-admin', () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));
vi.mock('@/lib/a-relire', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/a-relire')>();
  return { ...reel, chargerElementsARelire: (...args: unknown[]) => chargerElementsARelire(...args) };
});
vi.mock('@/lib/content', () => ({ getDraftCards: (...args: unknown[]) => getDraftCards(...args) }));
vi.mock('@/auth', () => ({ signOut: (...args: unknown[]) => signOut(...args) }));
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async (namespace: string) => {
    return (key: string, values?: Record<string, unknown>) =>
      values ? `${namespace}.${key}:${JSON.stringify(values)}` : `${namespace}.${key}`;
  }),
}));

import AdminRelecturePage from './page';
import type { ElementARelire, ElementsARelire } from '@/lib/a-relire';

function elt(overrides: Partial<ElementARelire> = {}): ElementARelire {
  return {
    id: 'domain:fr:budget',
    collection: 'domain',
    slug: 'budget',
    locale: 'fr',
    titre: 'Budget régional',
    motif: 'motif de test',
    ageDays: 42,
    lien: '/fr/domaines/budget',
    cheminFichier: 'content/domain-cards/budget.fr.mdx',
    ...overrides,
  };
}

const ELEMENTS_VIDES: ElementsARelire = { pagesIa: [], faq: [], chapeau: [] };

async function rendrePage() {
  return render(await AdminRelecturePage({ params: Promise.resolve({ locale: 'fr' }) }));
}

beforeEach(() => {
  requireAdmin.mockClear();
  chargerElementsARelire.mockReset();
  getDraftCards.mockReset();
  getDraftCards.mockReturnValue([]);
});

describe('AdminRelecturePage', () => {
  it('contrôle la session avant toute autre donnée', async () => {
    chargerElementsARelire.mockResolvedValue(ELEMENTS_VIDES);
    await rendrePage();
    expect(requireAdmin).toHaveBeenCalledWith('fr');
  });

  it('distingue le rapport SEO indisponible (null) de « aucune page à relire » (liste vide)', async () => {
    chargerElementsARelire.mockResolvedValue({ pagesIa: null, faq: [], chapeau: [] });
    await rendrePage();
    expect(screen.getByText('relecture.pagesIa.unavailable')).toBeDefined();
    expect(screen.queryByText('relecture.pagesIa.empty')).toBeNull();
  });

  it('affiche le message « aucune page » quand le rapport est utilisable mais vide', async () => {
    chargerElementsARelire.mockResolvedValue(ELEMENTS_VIDES);
    await rendrePage();
    expect(screen.getByText('relecture.pagesIa.empty')).toBeDefined();
    expect(screen.queryByText('relecture.pagesIa.unavailable')).toBeNull();
  });

  it('rend un élément avec son titre, son motif, son fichier et son lien', async () => {
    chargerElementsARelire.mockResolvedValue({
      pagesIa: [elt({ id: 'domain:fr:budget', motif: 'visitée par des assistants' })],
      faq: [],
      chapeau: [],
    });
    await rendrePage();
    expect(screen.getByText('Budget régional')).toBeDefined();
    expect(screen.getByText('visitée par des assistants')).toBeDefined();
    const lien = screen.getByRole('link', { name: /relecture\.item\.link/ });
    expect(lien.getAttribute('href')).toBe('/fr/domaines/budget');
  });

  it('affiche « titre indisponible » pour un élément non identifié', async () => {
    chargerElementsARelire.mockResolvedValue({
      pagesIa: [elt({ titre: null, cheminFichier: null })],
      faq: [],
      chapeau: [],
    });
    await rendrePage();
    expect(screen.getByText('relecture.item.unknownTitle')).toBeDefined();
    expect(screen.getByText('relecture.item.fileUnavailable')).toBeDefined();
  });

  it('passe le seuil SUMMARY_MAX_AGE_DAYS (90) au texte du chapeau, pas un second seuil inventé', async () => {
    chargerElementsARelire.mockResolvedValue(ELEMENTS_VIDES);
    await rendrePage();
    expect(screen.getByText('relecture.chapeau.explain:{"days":90}')).toBeDefined();
  });

  it("range les sections dans l'ordre : pages IA, FAQ, chapeau, brouillons", async () => {
    chargerElementsARelire.mockResolvedValue(ELEMENTS_VIDES);
    getDraftCards.mockReturnValue([]);
    await rendrePage();
    const titres = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titres).toEqual([
      'relecture.pagesIa.title',
      'relecture.faq.title',
      'relecture.chapeau.title',
      'review.title',
    ]);
  });

  it('affiche le total combinant les trois listes et les brouillons (pagesIa vide compte 0)', async () => {
    chargerElementsARelire.mockResolvedValue({
      pagesIa: [elt({ id: 'a' })],
      faq: [elt({ id: 'b' })],
      chapeau: [elt({ id: 'c' }), elt({ id: 'd' })],
    });
    getDraftCards.mockReturnValue([{ type: 'domain', title: 'X', slug: 'x', locale: 'fr', lastModified: '2026-01-01' }]);
    await rendrePage();
    // 1 + 1 + 2 + 1 brouillon = 5
    expect(screen.getByText('relecture.total:{"count":5}')).toBeDefined();
  });

  it('ne compte pas les pages IA dans le total quand le rapport est indisponible', async () => {
    chargerElementsARelire.mockResolvedValue({ pagesIa: null, faq: [], chapeau: [] });
    getDraftCards.mockReturnValue([]);
    await rendrePage();
    expect(screen.getByText('relecture.total:{"count":0}')).toBeDefined();
  });

  it('affiche le bloc brouillons vide avec le message existant de /review', async () => {
    chargerElementsARelire.mockResolvedValue(ELEMENTS_VIDES);
    getDraftCards.mockReturnValue([]);
    await rendrePage();
    expect(screen.getByText('review.empty')).toBeDefined();
  });

  it('rend une carte de brouillon quand il y en a', async () => {
    chargerElementsARelire.mockResolvedValue(ELEMENTS_VIDES);
    getDraftCards.mockReturnValue([
      { type: 'domain', title: 'Mobilité', slug: 'mobility', locale: 'fr', lastModified: '2026-09-01' },
    ]);
    await rendrePage();
    expect(screen.getByText('Mobilité')).toBeDefined();
  });
});
