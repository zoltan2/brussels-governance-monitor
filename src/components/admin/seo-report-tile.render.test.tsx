// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Le mock d'action du brief de tâche (`{ titre: '...' }` seul) est périmé :
 * seo-report.ts (tâche 8) exige aujourd'hui `{ regle, priorite, titre, url,
 * preuve, fenetre }` sur chaque action, et écarte toute action sans `url`.
 * Les fixtures ci-dessous suivent donc la forme réelle exportée par
 * `@/lib/seo-report`, pas celle du brief.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/seo-report', () => ({ readSeoReport: vi.fn() }));

import { readSeoReport, type RapportSeo } from '@/lib/seo-report';
import { SeoReportTile } from './seo-report-tile';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function blocOk<T>(donnees: T): any {
  return {
    status: 'ok' as const,
    message: null,
    generatedAt: new Date().toISOString(),
    scriptSha256: 'a'.repeat(64),
    donnees,
  };
}

function blocEnPanne(status: 'error' | 'blocked' | 'absent', message: string | null) {
  return {
    status,
    message,
    generatedAt: null,
    scriptSha256: null,
    donnees: null,
  };
}

const FRAICHEUR_NEUTRE = { gsc: null, umami: null, crawl: null };

describe('SeoReportTile', () => {
  it('affiche les clics belges et la première action suggérée', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk({
          totaux: { clics: null, impressions: null, ctr: null, position: null },
          totauxPrecedents: { clics: null, impressions: null, ctr: null, position: null },
          clicsBelgique: 905,
          clicsBelgiquePrecedents: 820,
          fenetre: null,
          pages: [],
          requetes: [],
          partRequetes: null,
          opportunitesTitre: [],
          actions: [
            {
              regle: 'titre-a-revoir',
              priorite: 1,
              titre: 'Titre à revoir : /fr/dossiers/acs',
              url: '/fr/dossiers/acs',
              preuve: 'CTR sous la médiane de bande',
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
        crawl: blocOk({ pages: [], bloquees: 0, echecs: 0 }),
      },
      fraicheur: FRAICHEUR_NEUTRE,
    } satisfies RapportSeo);

    render(await SeoReportTile());
    expect(screen.getByText(/905/)).toBeDefined();
    expect(screen.getByText(/Titre à revoir/)).toBeDefined();
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
    // Le bloc GSC est en panne : ses chiffres ne doivent jamais retomber sur
    // zéro, ils doivent rester marqués indisponibles.
    expect(screen.getAllByText(/Indisponible/).length).toBeGreaterThan(0);
    // La ligne « première action » elle-même doit dire indisponible, pas
    // « aucune action » : dire « aucune action » alors que le bloc qui les
    // calcule est en panne laisserait croire à tort qu'il n'y a rien à faire.
    const ligneAction = screen.getByText('Première action suggérée')
      .closest('div')
      ?.querySelector('dd');
    expect(ligneAction?.textContent).toBe('Indisponible');
  });

  it("distingue « aucune action cette semaine » d'une panne du bloc GSC", async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk({
          totaux: { clics: null, impressions: null, ctr: null, position: null },
          totauxPrecedents: { clics: null, impressions: null, ctr: null, position: null },
          clicsBelgique: 12,
          clicsBelgiquePrecedents: null,
          fenetre: null,
          pages: [],
          requetes: [],
          partRequetes: null,
          opportunitesTitre: [],
          actions: [],
        }),
        umami: blocEnPanne('absent', null),
        crawl: blocEnPanne('absent', null),
      },
      fraicheur: FRAICHEUR_NEUTRE,
    } satisfies RapportSeo);

    render(await SeoReportTile());
    expect(screen.getByText(/Aucune action cette semaine/)).toBeDefined();
    expect(screen.queryByText(/panne/)).toBeNull();
  });
});
