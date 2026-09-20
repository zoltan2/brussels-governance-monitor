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

  // Red team (2026-09-20) : clicsBelgiquePrecedents est une fenêtre de
  // 28 jours, pas « la semaine précédente » — le chiffre était juste,
  // l'étiquette était fausse, à au moins trois endroits.
  it("nomme la fenêtre de comparaison « 28 jours », jamais « semaine précédente »", async () => {
    vi.mocked(readSeoReport).mockResolvedValue(RAPPORT_NEUTRE);
    await rendrePage();
    expect(screen.queryByText(/semaine précédente/i)).toBeNull();
    expect(screen.getAllByText(/28 jours précédents/).length).toBeGreaterThan(0);
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

  function sectionActionsListItems(): Element[] {
    return Array.from(sectionActions()?.querySelectorAll('ul > li') ?? []);
  }

  it("tait la ligne « Fenêtre » d'une action quand la valeur est indisponible", async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk({
          ...DONNEES_GSC_VIDES,
          clicsBelgique: 10,
          actions: [
            {
              regle: 'titre-manquant',
              url: 'https://governance.brussels/fr/page-1',
              preuve: 'Aucun titre détecté.',
              titre: null,
              priorite: 1,
              fenetre: { debut: null, fin: null, fuseau: null },
            },
          ],
        }),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk(DONNEES_CRAWL_VIDES),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    const items = sectionActionsListItems();
    expect(items).toHaveLength(1);
    expect(items[0].textContent).not.toMatch(/Fenêtre/);
  });

  it("affiche la ligne « Fenêtre » d'une action quand la valeur est disponible", async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk({
          ...DONNEES_GSC_VIDES,
          clicsBelgique: 10,
          actions: [
            {
              regle: 'titre-manquant',
              url: 'https://governance.brussels/fr/page-1',
              preuve: 'Aucun titre détecté.',
              titre: null,
              priorite: 1,
              fenetre: {
                debut: '2026-08-21',
                fin: '2026-09-17',
                fuseau: 'America/Los_Angeles',
              },
            },
          ],
        }),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk(DONNEES_CRAWL_VIDES),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    const items = sectionActionsListItems();
    expect(items[0].textContent).toMatch(/Fenêtre/);
  });

  it("n'affiche pas deux fois la même URL quand le titre de l'action est l'URL entière", async () => {
    const url = 'https://governance.brussels/fr/page-tres-longue-a-corriger';
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk({
          ...DONNEES_GSC_VIDES,
          clicsBelgique: 10,
          actions: [
            {
              regle: 'titre-manquant',
              url,
              preuve: 'Aucun titre détecté.',
              titre: url,
              priorite: 1,
              fenetre: null,
            },
          ],
        }),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk(DONNEES_CRAWL_VIDES),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    const item = sectionActionsListItems()[0];
    // Le titre (premier <p>, en gras) ne doit pas répéter l'URL entière
    // affichée par ailleurs : combien de fois l'URL apparaît-elle en propre
    // texte de nœud dans l'action, tous éléments confondus ?
    const occurrences = Array.from(item.querySelectorAll('p, a')).filter(
      (el) => el.textContent === url,
    );
    expect(occurrences).toHaveLength(0);
    expect(screen.queryByText(url, { selector: 'p.font-semibold' })).toBeNull();
    // Le chemin (forme abrégée) reste affiché via le lien.
    expect(item.querySelector('a')?.textContent).toBe('/fr/page-tres-longue-a-corriger');
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

  function pageCrawl(url: string, statut: number | null) {
    return { url, statut, canonical: null, titre: 'Titre', description: 'Desc', hreflang: ['fr'] };
  }

  // Red team (2026-09-20) : la table « Pages sans statut 200 » rangeait
  // parmi les pages cassées celles dont le statut est inconnu (`null`) —
  // une page jamais contrôlée n'est pas prouvée cassée.
  it("distingue une page au statut inconnu d'une page réellement cassée dans la table", async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk({
          pages: [pageCrawl('/a', 404), pageCrawl('/b', null), pageCrawl('/c', 200)],
          bloquees: 0,
          echecs: 0,
        }),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    expect(screen.getByText('/a')).toBeDefined();
    expect(screen.queryByText('/b')).toBeNull();
    expect(screen.queryByText('/c')).toBeNull();
    // La page au statut inconnu doit être comptée ailleurs, pas silencieuse.
    const statutInconnu = screen
      .getByText('Pages au statut inconnu', { selector: 'dt' })
      .closest('div')
      ?.querySelector('dd');
    expect(statutInconnu?.textContent).toBe('1');
  });

  // Red team (2026-09-20) : la liste tronque à vingt sans dire combien
  // restent.
  it('annonce le reste quand la liste des pages cassées est tronquée à vingt', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk({
          pages: [
            ...Array.from({ length: 25 }, (_, i) => pageCrawl(`/cassee-${i}`, 500)),
            ...Array.from({ length: 600 }, (_, i) => pageCrawl(`/ok-${i}`, 200)),
          ],
          bloquees: 0,
          echecs: 0,
        }),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    expect(screen.getByText(/20 premières sur 25/)).toBeDefined();
  });

  // Correctif lisibilité (2026-09-20) : l'éditeur lit les chiffres bien
  // avant d'atteindre « À propos de ce relevé ». Chaque section doit
  // annoncer sa fenêtre en dates lisibles, sous son propre titre.
  function fenetresParSection() {
    // « Search Console », « Umami » et « Passage technique » sont chacun
    // titre d'un h3 dans Chiffres clés ET d'un h3 dans Détails : on prend le
    // premier du document (Chiffres clés, lu avant Détails).
    return {
      gsc: screen.getAllByRole('heading', { level: 3, name: 'Search Console' })[0]
        .nextElementSibling,
      umami: screen.getAllByRole('heading', { level: 3, name: 'Umami' })[0].nextElementSibling,
      crawl: screen.getAllByRole('heading', { level: 3, name: 'Passage technique' })[0]
        .nextElementSibling,
    };
  }

  it('affiche la fenêtre en dates lisibles sous le titre de chaque section', async () => {
    const fenetre = { debut: '2026-08-21', fin: '2026-09-17', fuseau: 'America/Los_Angeles' };
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES, fenetre),
        umami: blocOk(DONNEES_UMAMI_VIDES, { ...fenetre, fuseau: 'UTC' }),
        crawl: blocOk(DONNEES_CRAWL_VIDES, { ...fenetre, fuseau: 'UTC' }),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    const { gsc, umami, crawl } = fenetresParSection();
    expect(gsc?.textContent).toMatch(/28 jours, du 21 août au 17 septembre 2026/);
    expect(umami?.textContent).toMatch(/28 jours, du 21 août au 17 septembre 2026/);
    expect(crawl?.textContent).toMatch(/28 jours, du 21 août au 17 septembre 2026/);
  });

  it("n'affiche aucune phrase de fenêtre sous le titre d'une section dont la fenêtre est indisponible", async () => {
    vi.mocked(readSeoReport).mockResolvedValue(RAPPORT_NEUTRE);
    await rendrePage();
    const { gsc, umami, crawl } = fenetresParSection();
    expect(gsc?.textContent).not.toMatch(/\d+ jours, du/);
    expect(umami?.textContent).not.toMatch(/\d+ jours, du/);
    expect(crawl?.textContent).not.toMatch(/\d+ jours, du/);
  });

  it('nomme les chiffres clés en français simple, avec une explication sous chaque groupe', async () => {
    vi.mocked(readSeoReport).mockResolvedValue(RAPPORT_NEUTRE);
    await rendrePage();

    // Étiquettes qui se comprennent seules.
    expect(screen.getByText('Clics depuis la Belgique')).toBeDefined();
    expect(screen.queryByText('CTR', { selector: 'dt' })).toBeNull();
    expect(screen.getByText('Taux de clic', { selector: 'dt' })).toBeDefined();
    expect(screen.getByText('Position moyenne dans Google', { selector: 'dt' })).toBeDefined();
    expect(
      screen.queryByText('Position moyenne (plus bas = mieux classé)', { selector: 'dt' }),
    ).toBeNull();
    expect(
      screen.getByText('Visites ayant vu au moins deux pages', { selector: 'dt' }),
    ).toBeDefined();
    expect(screen.queryByText('Part des visites multi-pages', { selector: 'dt' })).toBeNull();

    // Phrases d'explication en clair.
    expect(screen.getByText(/comptent le monde entier/)).toBeDefined();
    expect(screen.getByText(/bruit international/)).toBeDefined();
    expect(screen.getByText(/1 étant la première place/)).toBeDefined();
    expect(
      screen.getByText(/la part des affichages dans les résultats qui ont donné un clic/),
    ).toBeDefined();
    expect(screen.getByText(/reparti aussitôt n.y est pas compté/)).toBeDefined();
  });

  it('affiche les dates de la période de comparaison des clics Belgique (28 jours précédant la fenêtre courante)', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES, {
          debut: '2026-08-21',
          fin: '2026-09-17',
          fuseau: 'America/Los_Angeles',
        }),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk(DONNEES_CRAWL_VIDES),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    // Les 28 jours précédant le 21 août 2026 : du 24 juillet au 20 août 2026.
    expect(screen.getByText(/24 juillet au 20 août 2026/)).toBeDefined();
  });

  it('affiche une phrase de synthèse quand le crawl ne trouve aucune anomalie', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk({
          pages: Array.from({ length: 628 }, (_, i) => ({
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
    expect(screen.getByText(/628 pages contrôlées, aucune anomalie/)).toBeDefined();
    // Pas de grille de « aucune » à côté de la phrase de synthèse.
    expect(screen.queryByText('Bloquées', { selector: 'dt' })).toBeNull();
    expect(screen.queryByText('Échecs', { selector: 'dt' })).toBeNull();
  });

  it('liste les anomalies détaillées, y compris les pages cassées, au lieu de la phrase de synthèse', async () => {
    vi.mocked(readSeoReport).mockResolvedValue({
      blocs: {
        gsc: blocOk(DONNEES_GSC_VIDES),
        umami: blocOk(DONNEES_UMAMI_VIDES),
        crawl: blocOk({
          pages: [
            ...Array.from({ length: 25 }, (_, i) => pageCrawl(`/cassee-${i}`, 500)),
            ...Array.from({ length: 600 }, (_, i) => pageCrawl(`/ok-${i}`, 200)),
          ],
          bloquees: 0,
          echecs: 0,
        }),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    } satisfies RapportSeo);

    await rendrePage();
    expect(screen.queryByText(/pages contrôlées, aucune anomalie/)).toBeNull();
    const cassees = screen
      .getByText('Pages sans statut 200', { selector: 'dt' })
      .closest('div')
      ?.querySelector('dd');
    expect(cassees?.textContent).toBe('25');
  });

});
