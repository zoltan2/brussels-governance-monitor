// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Le contrat JSON commun impose `fenetre` au premier niveau de chaque bloc :
 * Search Console est en heure du Pacifique, Umami en UTC. Un rapprochement
 * entre un chiffre de l'un et un chiffre de l'autre est faux si leurs
 * fenêtres diffèrent sans qu'on le dise ; cette page doit donc les afficher
 * côte à côte, chacune avec son fuseau nommé, jamais fusionnées ni devinées.
 *
 * Elle ne doit plus mentionner d'historique de semaines : rien ne le lit
 * (readSeoReport ne rend que le dernier relevé de chaque bloc), et une
 * section qui en parlerait, même pour dire qu'il est absent, ferait douter
 * du reste de la page.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/seo-report', () => ({ readSeoReport: vi.fn() }));
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn().mockResolvedValue(undefined) }));

import { readSeoReport, type RapportSeo } from '@/lib/seo-report';
import AdminRapportPage from './page';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function blocOk<T>(donnees: T, fenetre: RapportSeo['blocs']['gsc']['fenetre'] = null): any {
  return {
    status: 'ok' as const,
    message: null,
    generatedAt: new Date().toISOString(),
    scriptSha256: 'a'.repeat(64),
    fenetre,
    donnees,
  };
}

const DONNEES_GSC_VIDES = {
  totaux: { clics: null, impressions: null, ctr: null, position: null },
  totauxPrecedents: { clics: null, impressions: null, ctr: null, position: null },
  clicsBelgique: null,
  clicsBelgiquePrecedents: null,
  fenetre: null,
  pages: [],
  requetes: [],
  partRequetes: null,
  opportunitesTitre: [],
  actions: [],
};

const DONNEES_UMAMI_VIDES = {
  visites: null,
  visitesIa: [],
  pagesEntree: [],
  profondeur: null,
  evenements: null,
};

const DONNEES_CRAWL_VIDES = { pages: [], bloquees: null, echecs: null };

describe('AdminRapportPage', () => {
  it('affiche les fenêtres Search Console et Umami côte à côte, chacune avec son fuseau', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES, {
          debut: '2026-08-24',
          fin: '2026-09-20',
          fuseau: 'America/Los_Angeles',
        }),
        umami: blocOk(DONNEES_UMAMI_VIDES, {
          debut: '2026-08-24',
          fin: '2026-09-20',
          fuseau: 'UTC',
        }),
        crawl: blocOk(DONNEES_CRAWL_VIDES),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    render(await AdminRapportPage({ params: Promise.resolve({ locale: 'fr' }) }));

    // La fenêtre du panneau « Fenêtres d'analyse » (dt = nom du bloc, dd =
    // la fenêtre), pas la ligne « Relevé (UTC) » de MetaBloc qui contient
    // aussi le mot UTC pour chaque bloc.
    const fenetreGsc = screen
      .getByText('Search Console', { selector: 'dt' })
      .closest('div')
      ?.querySelector('dd');
    const fenetreUmami = screen
      .getByText('Umami', { selector: 'dt' })
      .closest('div')
      ?.querySelector('dd');

    expect(fenetreGsc?.textContent).toContain('America/Los_Angeles');
    expect(fenetreUmami?.textContent).toContain('UTC');
    // Les deux dates de la fenêtre doivent être visibles pour chaque bloc,
    // pas seulement le fuseau (sinon un lecteur pourrait croire à une
    // fenêtre commune).
    expect(fenetreGsc?.textContent).toContain('2026-08-24');
    expect(fenetreUmami?.textContent).toContain('2026-08-24');
  });

  it("n'invente pas de dates pour une fenêtre absente", async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES, null),
        umami: blocOk(DONNEES_UMAMI_VIDES, null),
        crawl: blocOk(DONNEES_CRAWL_VIDES, null),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    render(await AdminRapportPage({ params: Promise.resolve({ locale: 'fr' }) }));
    expect(screen.getAllByText(/fenêtre indisponible/i).length).toBeGreaterThan(0);
  });

  it("ne mentionne aucun historique de semaines", async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES, null),
        umami: blocOk(DONNEES_UMAMI_VIDES, null),
        crawl: blocOk(DONNEES_CRAWL_VIDES, null),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    render(await AdminRapportPage({ params: Promise.resolve({ locale: 'fr' }) }));
    expect(screen.queryByText(/historique/i)).toBeNull();
  });

  function valeurPagesPassees(): string | null | undefined {
    return screen
      .getByText('Pages passées', { selector: 'dt' })
      .closest('div')
      ?.querySelector('dd')?.textContent;
  }

  it("affiche indisponible quand pages est absent, pas un zéro", async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        // pages absent ou du mauvais type côté producteur : donnée manquante.
        crawl: blocOk({ pages: null, bloquees: null, echecs: null }),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    render(await AdminRapportPage({ params: Promise.resolve({ locale: 'fr' }) }));
    expect(valeurPagesPassees()).toBe('indisponible');
  });

  it("affiche un zéro écrit en toutes lettres quand pages est un tableau vide, pas indisponible", async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        // Tableau présent et vide : zéro page constatée cette semaine.
        crawl: blocOk({ pages: [], bloquees: null, echecs: null }),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    render(await AdminRapportPage({ params: Promise.resolve({ locale: 'fr' }) }));
    expect(valeurPagesPassees()).toBe('aucune page passée cette semaine');
  });
});
