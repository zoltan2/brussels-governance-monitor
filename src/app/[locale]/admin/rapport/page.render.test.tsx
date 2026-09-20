// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Le contrat JSON commun impose `fenetre` au premier niveau de chaque bloc :
 * Search Console est en heure du Pacifique, Umami en UTC. Un rapprochement
 * entre un chiffre de l'un et un chiffre de l'autre est faux si leurs
 * fenêtres diffèrent sans qu'on le dise ; cette page doit donc les afficher
 * côte à côte, chacune avec son fuseau nommé en clair, jamais fusionnées ni
 * devinées.
 *
 * Relecture design (2026-09-20) : l'unique lecteur de cette page, le lundi
 * matin, se demande « dois-je agir cette semaine, et sur quoi ? ». La page
 * doit donc répondre à cette question EN PREMIER (Actions suggérées), pas
 * après trois sections et quatre tableaux.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/seo-report', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/seo-report')>();
  return { ...reel, readSeoReport: vi.fn() };
});
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function blocEnPanne(status: 'error' | 'blocked' | 'absent', message: string | null): any {
  return {
    status,
    message,
    generatedAt: null,
    scriptSha256: null,
    fenetre: null,
    donnees: null,
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

const RAPPORT_NEUTRE = {
  blocs: {
    gsc: blocOk(DONNEES_GSC_VIDES),
    umami: blocOk(DONNEES_UMAMI_VIDES),
    crawl: blocOk(DONNEES_CRAWL_VIDES),
  },
  fraicheur: { gsc: null, umami: null, crawl: null },
} satisfies RapportSeo;

async function rendrePage() {
  return render(await AdminRapportPage({ params: Promise.resolve({ locale: 'fr' }) }));
}

describe('AdminRapportPage', () => {
  // Comportement explicitement demandé (relecture design) : la page doit
  // répondre à « dois-je agir cette semaine ? » en premier, pas en dernier
  // après métadonnées et tableaux.
  it('range les sections dans l\'ordre des questions : Actions, Chiffres clés, Détails, À propos', async () => {
    vi.mocked(readSeoReport).mockResolvedValue(RAPPORT_NEUTRE);
    await rendrePage();
    const titres = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titres).toEqual([
      'Actions suggérées',
      'Chiffres clés',
      'Détails',
      'À propos de ce relevé',
    ]);
  });

  it('affiche les fenêtres Search Console et Umami côte à côte, chacune avec son fuseau nommé', async () => {
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

    await rendrePage();

    // « Search Console » apparaît deux fois en <dt> dans « À propos de ce
    // relevé » (fenêtre, puis empreinte de script) : la fenêtre est la
    // première du document.
    const fenetreGsc = screen
      .getAllByText('Search Console', { selector: 'dt' })[0]
      .closest('div')
      ?.querySelector('dd');
    const fenetreUmami = screen
      .getAllByText('Umami', { selector: 'dt' })[0]
      .closest('div')
      ?.querySelector('dd');

    // Fuseau nommé en clair, pas l'identifiant IANA brut.
    expect(fenetreGsc?.textContent).toContain('heure du Pacifique');
    expect(fenetreUmami?.textContent).toContain('UTC');
    // Date lisible (JJ/MM/AAAA), pas l'ISO complet avec heure.
    expect(fenetreGsc?.textContent).toContain('24/08/2026');
    expect(fenetreGsc?.textContent).not.toContain('T00:00:00');
    // La phrase qui empêche de rapprocher un chiffre GSC d'un chiffre Umami.
    expect(screen.getByText(/ne rapprochez jamais un chiffre Search Console/)).toBeDefined();
  });

  it("n'invente pas de dates pour une fenêtre absente", async () => {
    vi.mocked(readSeoReport).mockResolvedValue(RAPPORT_NEUTRE);
    await rendrePage();
    expect(screen.getAllByText(/fenêtre indisponible/i).length).toBeGreaterThan(0);
  });

  it('ne mentionne aucun historique de semaines', async () => {
    vi.mocked(readSeoReport).mockResolvedValue(RAPPORT_NEUTRE);
    await rendrePage();
    expect(screen.queryByText(/historique/i)).toBeNull();
  });

  function statPagesPassees(): Element | null | undefined {
    return screen
      .getByText('Pages passées', { selector: 'dt' })
      .closest('div')
      ?.querySelector('dd');
  }

  it('affiche indisponible quand pages est absent, pas un zéro', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk({ pages: null, bloquees: null, echecs: null }),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    expect(statPagesPassees()?.textContent).toBe('indisponible');
  });

  // Comportement explicitement demandé (relecture design) : une couverture
  // nulle est la panne la plus bruyante possible côté technique. Elle doit
  // s'afficher en alerte ambre, jamais comme un « Alertes techniques 0 »
  // calme et gris, même quand bloquées et échecs valent zéro.
  it('affiche une alerte ambre quand la couverture du crawl est nulle, jamais un zéro neutre', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk({ pages: [], bloquees: 0, echecs: 0 }),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    const dd = statPagesPassees();
    expect(dd?.textContent).toMatch(/couverture/);
    expect(dd?.className).toContain('amber');
    // La carte qui l'entoure est ambre, pas neutre.
    expect(dd?.closest('div')?.className).toContain('amber');
  });

  // Distinct du cas « couverture nulle » ci-dessus : ici le crawl a bien
  // trouvé des pages (100), mais très en dessous des ~630 attendues. Ce cas
  // n'emprunte pas le même chemin de code que le zéro strict.
  it('affiche une alerte ambre quand la couverture du crawl est très inférieure au sitemap, sans être nulle', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk({
          pages: Array.from({ length: 100 }, (_, i) => ({
            url: `https://governance.brussels/fr/${i}`,
            statut: 200,
            canonical: null,
            titre: 'Titre',
            description: 'Description',
            hreflang: ['fr'],
          })),
          bloquees: 0,
          echecs: 0,
        }),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    const dd = statPagesPassees();
    expect(dd?.textContent).toMatch(/100.*couverture très faible/);
    expect(dd?.className).toContain('amber');
  });

  it('affiche un compte neutre quand la couverture est bonne', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk({
          pages: Array.from({ length: 630 }, (_, i) => ({
            url: `https://governance.brussels/fr/${i}`,
            statut: 200,
            canonical: null,
            titre: 'Titre',
            description: 'Description',
            hreflang: ['fr'],
          })),
          bloquees: 0,
          echecs: 0,
        }),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    const dd = statPagesPassees();
    expect(dd?.textContent).toBe('630');
    expect(dd?.className).not.toContain('amber');
  });

  function sectionActions(): Element | null {
    return screen.getByText('Actions suggérées', { selector: 'h2' }).closest('section');
  }

  it("dit la panne du bloc GSC dans la section Actions, jamais « aucune action »", async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocEnPanne('error', 'HTTP 403'),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk(DONNEES_CRAWL_VIDES),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    const texte = sectionActions()?.textContent ?? '';
    expect(texte).toMatch(/indisponible/);
    expect(texte).not.toMatch(/Aucune action cette semaine/);
  });

  // Comportement explicitement demandé (relecture design) : un bloc GSC
  // « ok » mais entièrement vide (aucune mesure) est un payload suspect,
  // pas une semaine sans action.
  it("dit indisponible, pas « aucune action », quand le bloc GSC est ok mais sans la moindre mesure", async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk({ ...DONNEES_GSC_VIDES, actions: [] }),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk(DONNEES_CRAWL_VIDES),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    const texte = sectionActions()?.textContent ?? '';
    expect(texte).toMatch(/indisponible/);
    expect(texte).not.toMatch(/Aucune action cette semaine/);
  });

  it('affiche une bannière role="alert" pour un bloc en panne et un bloc bloqué', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocEnPanne('error', 'HTTP 403'),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocEnPanne('blocked', 'sonde bloquée'),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    const textesAlertes = screen.getAllByRole('alert').map((a) => a.textContent ?? '');
    expect(
      textesAlertes.some((t) => t.includes('Search Console') && t.includes('en panne')),
    ).toBe(true);
    expect(
      textesAlertes.some((t) => t.includes('Crawl technique') && t.includes('bloqué')),
    ).toBe(true);
    // Pas de tiret cadratin dans les nouveaux textes.
    expect(textesAlertes.join('')).not.toContain('—');
  });

  it('affiche un unique verdict de fraîcheur sous le h1, avant le premier chiffre', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk(DONNEES_CRAWL_VIDES),
      },
      fraicheur: {
        gsc: { label: 'en retard : dernier relevé il y a 10 j', level: 'stale' },
        umami: null,
        crawl: null,
      },
    } satisfies RapportSeo);

    await rendrePage();
    const verdict = screen.getByText(/Search Console : en retard/);
    expect(verdict).toBeDefined();
    // Situé avant le premier h2 (Actions suggérées).
    const h1 = screen.getByRole('heading', { level: 1 });
    const premierH2 = screen.getAllByRole('heading', { level: 2 })[0];
    const position = h1.compareDocumentPosition(verdict);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const positionVsH2 = verdict.compareDocumentPosition(premierH2);
    expect(positionVsH2 & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('affiche les horodatages en heure de Bruxelles, jamais en UTC', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk(DONNEES_CRAWL_VIDES),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    expect(screen.queryByText(/Relevé \(UTC\)/)).toBeNull();
    expect(screen.getAllByText(/Relevé \(heure de Bruxelles\)/).length).toBeGreaterThan(0);
  });

  it('affiche la commande de référence pour vérifier l\'empreinte de chaque script', async () => {
    vi.mocked(readSeoReport).mockResolvedValue(RAPPORT_NEUTRE);
    await rendrePage();
    expect(screen.getByText(/sha256sum deploy\/seo-report\/bloc-gsc\.mjs/)).toBeDefined();
    expect(screen.getByText(/sha256sum deploy\/seo-report\/bloc-umami\.mjs/)).toBeDefined();
    expect(screen.getByText(/sha256sum deploy\/seo-report\/bloc-crawl\.mjs/)).toBeDefined();
  });
});
