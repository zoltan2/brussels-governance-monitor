// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Le mock d'action du brief de tâche (`{ titre: '...' }` seul) est périmé :
 * seo-report.ts (tâche 8) exige aujourd'hui `{ regle, priorite, titre, url,
 * preuve, fenetre }` sur chaque action, et écarte toute action sans `url`.
 * Les fixtures ci-dessous suivent donc la forme réelle exportée par
 * `@/lib/seo-report`.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/seo-report', async () => {
  const reel = await vi.importActual<typeof import('@/lib/seo-report')>('@/lib/seo-report');
  return {
    readSeoReport: vi.fn(),
    gscMesurePresente: reel.gscMesurePresente,
    pagesCassees: reel.pagesCassees,
  };
});

import { readSeoReport, type RapportSeo } from '@/lib/seo-report';
import { SeoReportTile } from './seo-report-tile';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function blocOk<T>(donnees: T): any {
  return {
    status: 'ok' as const,
    message: null,
    generatedAt: new Date().toISOString(),
    scriptSha256: 'a'.repeat(64),
    fenetre: null,
    donnees,
  };
}

function blocEnPanne(status: 'error' | 'blocked' | 'absent', message: string | null) {
  return {
    status,
    message,
    generatedAt: null,
    scriptSha256: null,
    fenetre: null,
    donnees: null,
  };
}

const GSC_VIDE = {
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

const FRAICHEUR_NEUTRE = { gsc: null, umami: null, crawl: null };

describe('SeoReportTile', () => {
  it('affiche le nombre d\'actions comme point focal et rend la première cliquable vers #actions', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk({
          ...GSC_VIDE,
          clicsBelgique: 905,
          clicsBelgiquePrecedents: 820,
          actions: [
            {
              regle: 'titre-a-revoir',
              priorite: 1,
              titre: 'Titre à revoir : /fr/dossiers/acs',
              url: '/fr/dossiers/acs',
              preuve: 'CTR sous la médiane de bande',
              fenetre: null,
            },
            {
              regle: 'page-orpheline',
              priorite: 2,
              titre: null,
              url: '/fr/dossiers/x',
              preuve: 'aucun lien entrant',
              fenetre: null,
            },
          ],
        }),
        umami: blocOk({
          visites: 500,
          visitesIa: [{ source: 'chatgpt.com', visites: 97 }],
          pagesEntree: [],
          profondeur: null,
          evenements: null,
        }),
        crawl: blocOk({
          pages: Array.from({ length: 630 }, (_, i) => ({ url: `/${i}`, statut: 200 })),
          bloquees: 0,
          echecs: 0,
        }),
      },
      fraicheur: FRAICHEUR_NEUTRE,
    } satisfies RapportSeo);

    render(await SeoReportTile());
    expect(screen.getByText(/905/)).toBeDefined();
    // Red team (2026-09-20) : « clicsBelgiquePrecedents » est une fenêtre
    // de 28 jours, pas la semaine précédente ; la variation doit le dire,
    // pas laisser croire à une comparaison semaine sur semaine.
    expect(screen.getByText(/\+85.*28 j/)).toBeDefined();
    // Point focal : le nombre d'actions, pas un chiffre secondaire.
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText(/actions à traiter cette semaine/)).toBeDefined();
    expect(screen.getByText(/Première de 2 actions suggérées/)).toBeDefined();
    const lien = screen.getByRole('link', { name: /Titre à revoir/ });
    expect(lien.getAttribute('href')).toBe('/fr/admin/rapport#actions');
  });

  it("annonce la panne d'un seul bloc sans masquer les autres", async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocEnPanne('error', 'HTTP 403'),
        umami: blocOk({
          visites: 500,
          visitesIa: [{ source: 'chatgpt.com', visites: 97 }],
          pagesEntree: [],
          profondeur: null,
          evenements: null,
        }),
        crawl: blocEnPanne('blocked', 'sonde bloquée'),
      },
      fraicheur: FRAICHEUR_NEUTRE,
    } satisfies RapportSeo);

    render(await SeoReportTile());
    expect(screen.getByText(/Search Console : panne/)).toBeDefined();
    expect(screen.getByText(/97/)).toBeDefined();
    // Le bloc GSC est en panne : le nombre d'actions ne doit jamais
    // retomber sur zéro, il doit rester marqué indisponible.
    expect(screen.getAllByText(/indisponible/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /admin\/rapport#actions/ })).toBeNull();
  });

  it("distingue « aucune action cette semaine » d'une panne du bloc GSC", async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk({ ...GSC_VIDE, clicsBelgique: 12, actions: [] }),
        umami: blocEnPanne('absent', null),
        crawl: blocEnPanne('absent', null),
      },
      fraicheur: FRAICHEUR_NEUTRE,
    } satisfies RapportSeo);

    render(await SeoReportTile());
    expect(screen.getByText(/Aucune action cette semaine/)).toBeDefined();
    expect(screen.queryByText(/panne/)).toBeNull();
  });

  // Comportement explicitement demandé (relecture design) : un bloc GSC
  // « ok » mais entièrement vide (aucune mesure) est un payload suspect,
  // pas une semaine sans action. Sans cette garde, la tuile rassure à tort.
  it("ne dit « aucune action » que si au moins une mesure Search Console existe, sinon indisponible", async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        // status ok, mais AUCUNE mesure (tout null) : payload suspect.
        gsc: blocOk({ ...GSC_VIDE, actions: [] }),
        umami: blocEnPanne('absent', null),
        crawl: blocEnPanne('absent', null),
      },
      fraicheur: FRAICHEUR_NEUTRE,
    } satisfies RapportSeo);

    render(await SeoReportTile());
    expect(screen.queryByText(/Aucune action cette semaine/)).toBeNull();
    expect(screen.getAllByText(/indisponible/).length).toBeGreaterThan(0);
  });

  function ligneVisitesAssistants(): Element | null | undefined {
    return screen
      .getByText("Visites d'assistants")
      .closest('div')
      ?.querySelector('dd');
  }

  it("affiche indisponible quand visitesIa est absent, pas un zéro", async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocEnPanne('absent', null),
        umami: blocOk({
          visites: 500,
          visitesIa: null, // champ absent ou du mauvais type côté producteur
          pagesEntree: [],
          profondeur: null,
          evenements: null,
        }),
        crawl: blocEnPanne('absent', null),
      },
      fraicheur: FRAICHEUR_NEUTRE,
    } satisfies RapportSeo);

    render(await SeoReportTile());
    expect(ligneVisitesAssistants()?.textContent).toBe('indisponible');
  });

  it("affiche « aucune » quand visitesIa est un tableau vide, pas indisponible", async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocEnPanne('absent', null),
        umami: blocOk({
          visites: 500,
          visitesIa: [], // COALESCE(..., '[]') : zéro visite constaté
          pagesEntree: [],
          profondeur: null,
          evenements: null,
        }),
        crawl: blocEnPanne('absent', null),
      },
      fraicheur: FRAICHEUR_NEUTRE,
    } satisfies RapportSeo);

    render(await SeoReportTile());
    expect(ligneVisitesAssistants()?.textContent).toBe('aucune');
  });

  function ligneAlertesTechniques(): Element | null | undefined {
    return screen
      .getByText('Alertes techniques')
      .closest('div')
      ?.querySelector('dd');
  }

  // Comportement explicitement demandé (relecture design) : une couverture
  // de crawl nulle est la panne la plus bruyante possible côté technique ;
  // elle doit s'afficher en alerte même quand bloquées et échecs valent
  // zéro, jamais comme un « Alertes techniques 0 » calme et gris.
  it('affiche une alerte ambre quand la couverture du crawl est nulle, jamais un zéro neutre', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocEnPanne('absent', null),
        umami: blocEnPanne('absent', null),
        crawl: blocOk({ pages: [], bloquees: 0, echecs: 0 }),
      },
      fraicheur: FRAICHEUR_NEUTRE,
    } satisfies RapportSeo);

    render(await SeoReportTile());
    const ligne = ligneAlertesTechniques();
    expect(ligne?.textContent).toMatch(/couverture/);
    expect(ligne?.className).toContain('amber');
  });

  it('affiche « aucune » sans ambre quand bloquées et échecs valent zéro et la couverture est bonne', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocEnPanne('absent', null),
        umami: blocEnPanne('absent', null),
        crawl: blocOk({
          pages: Array.from({ length: 630 }, (_, i) => ({ url: `/${i}`, statut: 200 })),
          bloquees: 0,
          echecs: 0,
        }),
      },
      fraicheur: FRAICHEUR_NEUTRE,
    } satisfies RapportSeo);

    render(await SeoReportTile());
    const ligne = ligneAlertesTechniques();
    expect(ligne?.textContent).toBe('aucune');
    expect(ligne?.className).not.toContain('amber');
  });

  // Red team (2026-09-20) : rendu vérifié avec un 404 et un 500 dans le
  // passage technique, bloquées: 0, échecs: 0 — la tuile annonçait
  // « Alertes techniques 0 » pendant que la page listait ces deux pages
  // cassées. Le compte ne sommait que bloquées et échecs réseau, jamais
  // les pages récupérées avec un statut cassé.
  it('compte les pages cassées (statut connu ≠ 200) dans les alertes techniques, pas seulement bloquées et échecs', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocEnPanne('absent', null),
        umami: blocEnPanne('absent', null),
        crawl: blocOk({
          pages: [
            ...Array.from({ length: 628 }, (_, i) => ({ url: `/${i}`, statut: 200 })),
            { url: '/a', statut: 404 },
            { url: '/b', statut: 500 },
          ],
          bloquees: 0,
          echecs: 0,
        }),
      },
      fraicheur: FRAICHEUR_NEUTRE,
    } satisfies RapportSeo);

    render(await SeoReportTile());
    const ligne = ligneAlertesTechniques();
    expect(ligne?.textContent).toMatch(/2 alertes/);
    expect(ligne?.className).toContain('amber');
  });
});
