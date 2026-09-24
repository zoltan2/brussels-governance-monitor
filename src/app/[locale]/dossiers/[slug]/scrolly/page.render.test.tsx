// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * La vue scrolly d'un dossier `draft: true` échappait au traitement des six
 * pages [slug] structurées (voir src/lib/metadata.test.ts, ce fichier étant
 * le pendant pour la seule route qui rend le contenu autrement) : sa route
 * porte déjà `robots: { index: false, follow: false }` en dur (spec D §7.1,
 * couvert par page.test.ts), mais Pagefind indexe le HTML statique généré
 * sans lire les meta robots — constaté en pratique avec la fiche ZRU
 * (zone-revitalisation-urbaine), déjà dans SCROLLY_ENABLED_DOSSIERS : ses 4
 * URL scrolly apparaissaient dans l'index construit. Ce test prouve que
 * `<SearchExclude>` (data-pagefind-ignore) et le bandeau `<DraftBanner>`
 * apparaissent bien pour un brouillon, et qu'aucun des deux n'apparaît pour
 * une fiche publiée.
 */
import { render, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fr from '../../../../../../messages/fr.json';

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

// Le rendu MDX réel exige un `code` compilé par @mdx-js/mdx ; hors sujet ici
// (on teste l'enveloppe autour du contenu, pas le contenu), donc un stub.
vi.mock('@/components/dossier-mdx-content', () => ({
  DossierMdxContent: () => <div data-testid="mdx-stub">contenu mdx</div>,
}));

function fabriquerCarte(draft: boolean) {
  return {
    slug: 'cpas-bruxellois',
    locale: 'fr' as const,
    title: 'CPAS bruxellois',
    summary: 'Résumé du dossier.',
    lastModified: '2026-05-02',
    content: 'mdx content',
    metrics: [],
    draft,
  };
}

vi.mock('@/lib/content', () => ({
  getDossierByLocalizedSlug: vi.fn((slugFromUrl: string) => {
    if (slugFromUrl !== 'cpas-bruxellois') return null;
    const draft = (globalThis as { __draftFixture?: boolean }).__draftFixture ?? false;
    return { card: fabriquerCarte(draft), isFallback: false };
  }),
  getDossierCard: vi.fn(),
  getLocalizedSlug: vi.fn((card: { slug: string }) => card.slug),
}));

afterEach(() => {
  cleanup();
  delete (globalThis as { __draftFixture?: boolean }).__draftFixture;
});

async function rendreScrolly(draft: boolean) {
  (globalThis as { __draftFixture?: boolean }).__draftFixture = draft;
  const { default: ScrollyPage } = await import('./page');
  const jsx = await ScrollyPage({
    params: Promise.resolve({ locale: 'fr', slug: 'cpas-bruxellois' }),
  });
  return render(
    <NextIntlClientProvider locale="fr" messages={fr} timeZone="Europe/Brussels">
      {jsx}
    </NextIntlClientProvider>,
  );
}

describe('Scrolly page — brouillon', () => {
  it('brouillon : data-pagefind-ignore posé (hors index Pagefind) et bandeau affiché', async () => {
    const { container } = await rendreScrolly(true);
    expect(container.querySelector('[data-pagefind-ignore="all"]')).not.toBeNull();
    expect(container.textContent).toMatch(/BROUILLON/);
    expect(container.textContent).toContain('non listée et non indexée');
  });

  it('publié : ni data-pagefind-ignore, ni bandeau', async () => {
    const { container } = await rendreScrolly(false);
    expect(container.querySelector('[data-pagefind-ignore="all"]')).toBeNull();
    expect(container.textContent).not.toMatch(/BROUILLON/);
  });
});
