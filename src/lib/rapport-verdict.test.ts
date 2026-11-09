// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { mediane, picDeFenetre, verdictRapport, ecartPourcent } from './rapport-verdict';
import type { Bloc, GscDonnees, JourClics, PageCrawl, RapportSeo, StatutBloc } from './seo-report';

const NNBSP = ' ';
const MOINS = '−';

function bloc<T>(donnees: T | null, status: StatutBloc = 'ok'): Bloc<T> {
  return {
    status,
    message: null,
    generatedAt: null,
    scriptSha256: null,
    fenetre: null,
    donnees: status === 'ok' ? donnees : null,
  };
}

function gsc(champs: Partial<GscDonnees>): GscDonnees {
  return {
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
    actionsEcartees: null,
    publieRecemment: { liste: [], total: null },
    requetesEmergentes: [],
    totauxBelgique: null,
    totauxBelgiquePrecedents: null,
    clicsBelgiqueParJour: null,
    clicsBelgiqueParJourPrecedent: null,
    parLangue: null,
    requetesBelgique: true,
    ...champs,
  };
}

function rapport(
  champsGsc: Partial<GscDonnees>,
  options: {
    statuts?: Partial<Record<keyof RapportSeo['blocs'], StatutBloc>>;
    pages?: PageCrawl[] | null;
  } = {},
): Pick<RapportSeo, 'blocs'> {
  const s = options.statuts ?? {};
  return {
    blocs: {
      gsc: bloc(gsc(champsGsc), s.gsc),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      umami: bloc({} as any, s.umami),
      crawl: bloc({ pages: options.pages ?? [], bloquees: 0, echecs: 0 }, s.crawl),
    },
  };
}

/** 28 jours à `base` clics, dont un jour (le 14/10) à `pic` clics. */
function fenetreAvecPic(base: number, pic: number | null, debut = '2026-09-17'): JourClics[] {
  const [a, m, j] = debut.split('-').map(Number);
  return Array.from({ length: 28 }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1, j + i)).toISOString().slice(0, 10);
    return { date: d, clics: d === '2026-10-14' && pic !== null ? pic : base, impressions: null };
  });
}

describe('verdictRapport', () => {
  it('dit « audience stable » sous 10 % d’écart, avec l’écart signé', () => {
    expect(verdictRapport(rapport({ clicsBelgique: 860, clicsBelgiquePrecedents: 900 }))).toEqual([
      `Audience stable : 860 clics depuis la Belgique sur 28 jours (${MOINS}4 %).`,
    ]);
    expect(verdictRapport(rapport({ clicsBelgique: 930, clicsBelgiquePrecedents: 900 }))).toEqual([
      'Audience stable : 930 clics depuis la Belgique sur 28 jours (+3 %).',
    ]);
    expect(verdictRapport(rapport({ clicsBelgique: 900, clicsBelgiquePrecedents: 900 }))).toEqual([
      'Audience stable : 900 clics depuis la Belgique sur 28 jours (0 %).',
    ]);
  });

  // Le seuil porte sur le pourcentage arrondi (celui qu'on affiche), et
  // l'arrondi est symétrique : −9,5 % et +9,5 % tombent du même côté.
  it('applique le seuil de 10 % au pourcentage arrondi, symétriquement', () => {
    const v = (a: number) =>
      verdictRapport(rapport({ clicsBelgique: a, clicsBelgiquePrecedents: 1000 }))[0];
    expect(v(906)).toMatch(/^Audience stable .*\(−9 %\)/);
    expect(v(905)).toBe(`Clics depuis la Belgique en baisse de 10 % (905 contre 1${NNBSP}000).`);
    expect(v(1094)).toMatch(/^Audience stable .*\(\+9 %\)/);
    expect(v(1095)).toBe(
      `Clics depuis la Belgique en hausse de 10 % (1${NNBSP}095 contre 1${NNBSP}000).`,
    );
  });

  it('dit la baisse avec les deux totaux, sans série par jour', () => {
    expect(verdictRapport(rapport({ clicsBelgique: 860, clicsBelgiquePrecedents: 1012 }))).toEqual([
      `Clics depuis la Belgique en baisse de 15 % (860 contre 1${NNBSP}012).`,
    ]);
  });

  // Données réelles du 09/11/2026 : 860 contre 1 012, avec un jour isolé à
  // 106 clics dans la fenêtre précédente.
  it('isole un pic de la fenêtre précédente quand la baisse en dépend', () => {
    const phrases = verdictRapport(
      rapport({
        clicsBelgique: 860,
        clicsBelgiquePrecedents: 1012,
        clicsBelgiqueParJourPrecedent: fenetreAvecPic(30, 106),
        clicsBelgiqueParJour: fenetreAvecPic(30, null, '2026-10-15'),
      }),
    );
    // 1 012 − 106 + 30 = 936 ; (860 − 936) / 936 = −8,1 %.
    expect(phrases).toEqual([
      `Clics depuis la Belgique en baisse de 15 % (860 contre 1${NNBSP}012).`,
      `Sans le pic du 14 octobre (106 clics), l'écart serait de ${MOINS}8 %.`,
    ]);
  });

  it('ne parle pas de pic à 2,5 fois la médiane pile, seulement au-delà', () => {
    const base = { clicsBelgique: 860, clicsBelgiquePrecedents: 1012 };
    expect(
      verdictRapport(rapport({ ...base, clicsBelgiqueParJourPrecedent: fenetreAvecPic(30, 75) })),
    ).toHaveLength(1);
    expect(
      verdictRapport(
        rapport({ ...base, clicsBelgiqueParJourPrecedent: fenetreAvecPic(30, 76) }),
      )[1],
    ).toMatch(/^Sans le pic du 14 octobre \(76 clics\)/);
  });

  it('cherche le pic dans la fenêtre courante en hausse, jamais dans la précédente', () => {
    const phrases = verdictRapport(
      rapport({
        clicsBelgique: 1200,
        clicsBelgiquePrecedents: 900,
        clicsBelgiqueParJour: fenetreAvecPic(40, 300, '2026-09-20'),
        clicsBelgiqueParJourPrecedent: fenetreAvecPic(30, 500),
      }),
    );
    // 1 200 − 300 + 40 = 940 ; (940 − 900) / 900 = +4,4 %.
    expect(phrases).toEqual([
      `Clics depuis la Belgique en hausse de 33 % (1${NNBSP}200 contre 900).`,
      "Sans le pic du 14 octobre (300 clics), l'écart serait de +4 %.",
    ]);
  });

  it('ne cherche pas de pic dans la fenêtre courante en baisse', () => {
    const phrases = verdictRapport(
      rapport({
        clicsBelgique: 860,
        clicsBelgiquePrecedents: 1012,
        clicsBelgiqueParJour: fenetreAvecPic(30, 300, '2026-09-20'),
        clicsBelgiqueParJourPrecedent: fenetreAvecPic(36, null),
      }),
    );
    expect(phrases).toHaveLength(1);
  });

  it('ne cherche aucun pic quand l’audience est stable', () => {
    const phrases = verdictRapport(
      rapport({
        clicsBelgique: 900,
        clicsBelgiquePrecedents: 920,
        clicsBelgiqueParJourPrecedent: fenetreAvecPic(30, 200),
      }),
    );
    expect(phrases).toHaveLength(1);
  });

  it('se tait sur le pic quand la série par jour est absente ou vide', () => {
    const base = { clicsBelgique: 860, clicsBelgiquePrecedents: 1012 };
    expect(verdictRapport(rapport({ ...base, clicsBelgiqueParJourPrecedent: null }))).toHaveLength(
      1,
    );
    expect(verdictRapport(rapport({ ...base, clicsBelgiqueParJourPrecedent: [] }))).toHaveLength(1);
  });

  it('écarte un jour à null du calcul du pic, sans le compter comme zéro', () => {
    const jours = fenetreAvecPic(30, 106).map((j, i) => (i < 20 ? { ...j, clics: null } : j));
    // Sans les jours à null, la médiane reste 30 ; comptés à zéro, elle
    // tomberait à 0.
    expect(picDeFenetre(jours)).toEqual({ date: '2026-10-14', clics: 106, mediane: 30 });
    expect(picDeFenetre(jours.map((j) => ({ ...j, clics: null })))).toBeNull();
  });

  it('ne calcule aucun pourcentage sur une période précédente à zéro', () => {
    expect(verdictRapport(rapport({ clicsBelgique: 40, clicsBelgiquePrecedents: 0 }))).toEqual([
      '40 clics depuis la Belgique sur 28 jours, contre aucun sur les 28 jours précédents.',
    ]);
    expect(verdictRapport(rapport({ clicsBelgique: 0, clicsBelgiquePrecedents: 0 }))).toEqual([
      'Aucun clic depuis la Belgique sur 28 jours, ni sur les 28 jours précédents.',
    ]);
    expect(ecartPourcent(40, 0)).toBeNull();
  });

  it('dit indisponible plutôt que zéro quand un total manque', () => {
    expect(verdictRapport(rapport({ clicsBelgique: 1, clicsBelgiquePrecedents: null }))).toEqual([
      '1 clic depuis la Belgique sur 28 jours ; période précédente indisponible.',
    ]);
    expect(verdictRapport(rapport({ clicsBelgique: null, clicsBelgiquePrecedents: 900 }))).toEqual([
      'Clics depuis la Belgique non transmis dans ce relevé : pas de verdict.',
    ]);
  });

  it('ouvre sur « Relevé incomplet » quand un bloc n’est pas ok, sans chiffre d’audience sans Search Console', () => {
    expect(
      verdictRapport(
        rapport(
          { clicsBelgique: 860, clicsBelgiquePrecedents: 1012 },
          { statuts: { gsc: 'error' } },
        ),
      ),
    ).toEqual(['Relevé incomplet : Search Console en panne.']);
    expect(
      verdictRapport(
        rapport(
          { clicsBelgique: 860, clicsBelgiquePrecedents: 900 },
          { statuts: { umami: 'blocked', crawl: 'absent' } },
        ),
      ),
    ).toEqual([
      'Relevé incomplet : Umami bloqué, passage technique sans relevé.',
      'Audience stable : 860 clics depuis la Belgique sur 28 jours (−4 %).',
    ]);
    expect(verdictRapport(rapport({}, { statuts: { gsc: 'format-inconnu' } }))[0]).toBe(
      'Relevé incomplet : Search Console au format non reconnu.',
    );
  });

  it('compte les pages en erreur, jamais une page au statut inconnu', () => {
    const page = (statut: number | null): PageCrawl => ({
      url: '/x',
      statut,
      canonical: null,
      titre: 't',
      description: 'd',
      hreflang: ['fr'],
    });
    const base = { clicsBelgique: 860, clicsBelgiquePrecedents: 900 };
    expect(
      verdictRapport(rapport(base, { pages: [page(404), page(500), page(null), page(200)] }))[1],
    ).toBe('2 pages en erreur.');
    expect(verdictRapport(rapport(base, { pages: [page(404)] }))[1]).toBe('1 page en erreur.');
    expect(verdictRapport(rapport(base, { pages: [page(200), page(null)] }))).toHaveLength(1);
    expect(verdictRapport(rapport(base, { pages: null }))).toHaveLength(1);
  });

  it('calcule la médiane d’un nombre pair de jours comme la moyenne des deux du milieu', () => {
    expect(mediane([1, 3, 10, 2])).toBe(2.5);
    expect(mediane([5])).toBe(5);
    expect(mediane([])).toBeNull();
  });
});
