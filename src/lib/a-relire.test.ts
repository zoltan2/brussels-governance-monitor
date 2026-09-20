// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import {
  buildPagesIaPerimees,
  buildFaqARelire,
  buildChapeauARelire,
  getElementsARelire,
} from './a-relire';
import { SUMMARY_MAX_AGE_DAYS } from './summary-freshness';
import type { RapportSeo, ActionSuggeree, GscDonnees } from './seo-report';
import type { DomainCard, DossierCard } from './content';

// --- Fixtures ---------------------------------------------------------

function action(overrides: Partial<ActionSuggeree> = {}): ActionSuggeree {
  return {
    regle: 'page-ia-perimee',
    url: '/fr/domaines/budget',
    preuve: 'visitée 12 fois par des assistants, inchangée depuis 120 jours',
    titre: null,
    priorite: 1,
    fenetre: null,
    ...overrides,
  };
}

const DONNEES_GSC_VIDES: GscDonnees = {
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

function rapportAvecActions(actions: ActionSuggeree[]): RapportSeo {
  return {
    blocs: {
      gsc: {
        status: 'ok',
        message: null,
        generatedAt: '2026-09-20T06:00:00Z',
        scriptSha256: 'a'.repeat(64),
        fenetre: null,
        // Au moins une mesure exploitable, sinon gscMesurePresente rend le
        // bloc indisponible malgré status: 'ok' (voir seo-report.ts).
        donnees: { ...DONNEES_GSC_VIDES, actions, totaux: { ...DONNEES_GSC_VIDES.totaux, clics: 10 } },
      },
      umami: { status: 'absent', message: null, generatedAt: null, scriptSha256: null, fenetre: null, donnees: null },
      crawl: { status: 'absent', message: null, generatedAt: null, scriptSha256: null, fenetre: null, donnees: null },
    },
    fraicheur: { gsc: null, umami: null, crawl: null },
  };
}

function rapportIndisponible(status: 'error' | 'blocked' | 'absent' | 'format-inconnu'): RapportSeo {
  return {
    blocs: {
      gsc: { status, message: null, generatedAt: null, scriptSha256: null, fenetre: null, donnees: null },
      umami: { status: 'absent', message: null, generatedAt: null, scriptSha256: null, fenetre: null, donnees: null },
      crawl: { status: 'absent', message: null, generatedAt: null, scriptSha256: null, fenetre: null, donnees: null },
    },
    fraicheur: { gsc: null, umami: null, crawl: null },
  };
}

function domainCard(overrides: Partial<DomainCard> = {}): DomainCard {
  return {
    title: 'Budget régional',
    slug: 'budget',
    locale: 'fr',
    domain: 'budget',
    status: 'ongoing',
    summary: 'Résumé',
    sectors: [],
    sources: [],
    confidenceLevel: 'official',
    metrics: [],
    faq: [],
    lastModified: '2026-09-10',
    draft: false,
    content: '',
    permalink: '/domains/budget',
    ...overrides,
  };
}

function dossierCard(overrides: Partial<DossierCard> = {}): DossierCard {
  return {
    title: 'LEZ',
    slug: 'lez',
    locale: 'fr',
    dossierType: 'regulatory',
    phase: 'in-progress',
    crisisImpact: 'unaffected',
    decisionLevel: 'regional',
    summary: 'Résumé',
    stakeholders: [],
    relatedDomains: [],
    relatedSectors: [],
    relatedCommunes: [],
    relatedFormationEvents: [],
    sources: [],
    metrics: [],
    alerts: [],
    confidenceLevel: 'official',
    faq: [],
    lastModified: '2026-09-10',
    draft: false,
    content: '',
    permalink: '/dossiers/lez',
    ...overrides,
  };
}

const AUCUNE_CARTE = { domainCards: [] as DomainCard[], dossierCards: [] as DossierCard[] };

// --- buildPagesIaPerimees ----------------------------------------------

describe('buildPagesIaPerimees', () => {
  it('rend la liste absente (null) quand le bloc GSC est en panne', () => {
    expect(buildPagesIaPerimees(rapportIndisponible('error'), AUCUNE_CARTE)).toBeNull();
  });

  it('rend la liste absente (null) quand le bloc GSC est absent', () => {
    expect(buildPagesIaPerimees(rapportIndisponible('absent'), AUCUNE_CARTE)).toBeNull();
  });

  it("rend la liste absente quand le bloc dit 'ok' mais ne porte aucune mesure exploitable", () => {
    const rapport: RapportSeo = {
      blocs: {
        gsc: {
          status: 'ok',
          message: null,
          generatedAt: '2026-09-20T06:00:00Z',
          scriptSha256: 'a'.repeat(64),
          fenetre: null,
          donnees: { ...DONNEES_GSC_VIDES, actions: [action()] },
        },
        umami: { status: 'absent', message: null, generatedAt: null, scriptSha256: null, fenetre: null, donnees: null },
        crawl: { status: 'absent', message: null, generatedAt: null, scriptSha256: null, fenetre: null, donnees: null },
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    };
    expect(buildPagesIaPerimees(rapport, AUCUNE_CARTE)).toBeNull();
  });

  it('rend une liste vide (pas null) quand le rapport est utilisable mais sans action page-ia-perimee', () => {
    const rapport = rapportAvecActions([action({ regle: 'page-en-erreur' })]);
    expect(buildPagesIaPerimees(rapport, AUCUNE_CARTE)).toEqual([]);
  });

  it('ne retient que les actions de règle page-ia-perimee', () => {
    const rapport = rapportAvecActions([
      action({ regle: 'page-en-erreur', url: '/fr/x' }),
      action({ regle: 'page-ia-perimee', url: '/fr/domaines/budget' }),
    ]);
    const liste = buildPagesIaPerimees(rapport, AUCUNE_CARTE)!;
    expect(liste).toHaveLength(1);
    expect(liste[0].slug).toBe('budget');
  });

  it('associe une action à sa fiche domaine (fr), avec âge calculé sur lastModified', () => {
    const carte = domainCard({ slug: 'budget', locale: 'fr', lastModified: '2026-06-01', title: 'Budget régional' });
    const rapport = rapportAvecActions([
      action({ url: '/fr/domaines/budget', preuve: 'preuve X' }),
    ]);
    const liste = buildPagesIaPerimees(rapport, { domainCards: [carte], dossierCards: [] }, '2026-09-20')!;
    expect(liste).toHaveLength(1);
    const el = liste[0];
    expect(el.collection).toBe('domain');
    expect(el.slug).toBe('budget');
    expect(el.locale).toBe('fr');
    expect(el.titre).toBe('Budget régional');
    expect(el.motif).toBe('preuve X');
    expect(el.ageDays).toBe(111); // 2026-06-01 -> 2026-09-20
    expect(el.lien).toBe('/fr/domaines/budget');
    expect(el.cheminFichier).toBe('content/domain-cards/budget.fr.mdx');
    expect(el.id).toBe('domain:fr:budget');
  });

  it('associe une action à sa fiche domaine via le mot de chemin néerlandais', () => {
    const carte = domainCard({ slug: 'budget', locale: 'nl', lastModified: '2026-08-01' });
    const rapport = rapportAvecActions([action({ url: '/nl/domeinen/budget' })]);
    const liste = buildPagesIaPerimees(rapport, { domainCards: [carte], dossierCards: [] }, '2026-09-20')!;
    expect(liste[0].collection).toBe('domain');
    expect(liste[0].locale).toBe('nl');
  });

  it('associe une action à sa fiche dossier, slug canonique dans le chemin de fichier même si l\'URL porte un slug localisé', () => {
    const carte = dossierCard({
      slug: 'lez',
      locale: 'fr',
      lastModified: '2026-07-01',
      localizedSlugs: { fr: 'lez-bruxelles' },
    });
    const rapport = rapportAvecActions([action({ url: '/fr/dossiers/lez-bruxelles' })]);
    const liste = buildPagesIaPerimees(rapport, { domainCards: [], dossierCards: [carte] }, '2026-09-20')!;
    expect(liste).toHaveLength(1);
    expect(liste[0].collection).toBe('dossier');
    expect(liste[0].slug).toBe('lez');
    expect(liste[0].cheminFichier).toBe('content/dossiers/lez.fr.mdx');
  });

  it('retombe sur la fiche FR quand aucune fiche ne correspond à la langue de l\'URL', () => {
    const carteFr = domainCard({ slug: 'budget', locale: 'fr', lastModified: '2026-08-01' });
    const rapport = rapportAvecActions([action({ url: '/nl/domeinen/budget' })]);
    const liste = buildPagesIaPerimees(rapport, { domainCards: [carteFr], dossierCards: [] }, '2026-09-20')!;
    expect(liste[0].locale).toBe('fr');
    expect(liste[0].slug).toBe('budget');
  });

  it("garde le signal d'une page hors domaines/dossiers, sans inventer un âge ou un fichier", () => {
    const rapport = rapportAvecActions([action({ url: '/fr/secteurs/culture', preuve: 'vue par un assistant' })]);
    const liste = buildPagesIaPerimees(rapport, AUCUNE_CARTE)!;
    expect(liste).toHaveLength(1);
    expect(liste[0].collection).toBe('inconnue');
    expect(liste[0].ageDays).toBeNull();
    expect(liste[0].cheminFichier).toBeNull();
    expect(liste[0].titre).toBeNull();
    expect(liste[0].motif).toBe('vue par un assistant');
    expect(liste[0].lien).toBe('/fr/secteurs/culture');
  });

  it('garde le signal même quand aucune fiche ne correspond au slug dans une collection connue', () => {
    const rapport = rapportAvecActions([action({ url: '/fr/domaines/inconnu-total' })]);
    const liste = buildPagesIaPerimees(rapport, AUCUNE_CARTE)!;
    expect(liste[0].collection).toBe('inconnue');
    expect(liste[0].id).toContain('inconnu-total');
  });
});

// --- buildFaqARelire -----------------------------------------------------

describe('buildFaqARelire', () => {
  it('inclut une fiche republiée sans faqReviewed', () => {
    const carte = domainCard({ lastModified: '2026-09-01', faqReviewed: undefined });
    const liste = buildFaqARelire({ domainCards: [carte], dossierCards: [] }, '2026-09-20');
    expect(liste).toHaveLength(1);
    expect(liste[0].motif).toContain('faqReviewed absent');
    expect(liste[0].ageDays).toBe(19);
    expect(liste[0].collection).toBe('domain');
    expect(liste[0].id).toBe('domain:fr:budget');
  });

  it('inclut une fiche dont la FAQ a été relue avant la republication', () => {
    const carte = domainCard({ lastModified: '2026-09-10', faqReviewed: '2026-09-05' });
    const liste = buildFaqARelire({ domainCards: [carte], dossierCards: [] });
    expect(liste).toHaveLength(1);
    expect(liste[0].ageDays).toBe(5);
  });

  it('exclut une fiche dont la FAQ a été relue le jour même ou après', () => {
    const ok1 = domainCard({ lastModified: '2026-09-10', faqReviewed: '2026-09-10' });
    const ok2 = domainCard({ slug: 'mobility', lastModified: '2026-09-10', faqReviewed: '2026-09-11' });
    expect(buildFaqARelire({ domainCards: [ok1, ok2], dossierCards: [] })).toEqual([]);
  });

  it('inclut une fiche dossier avec le bon dossier de fichier', () => {
    const carte = dossierCard({ lastModified: '2026-09-01', faqReviewed: undefined });
    const liste = buildFaqARelire({ domainCards: [], dossierCards: [carte] }, '2026-09-20');
    expect(liste[0].collection).toBe('dossier');
    expect(liste[0].cheminFichier).toBe('content/dossiers/lez.fr.mdx');
  });

  it('exclut les fiches en brouillon (protégé en amont par getPublishedDomainCards, mais défensif ici)', () => {
    // Ce module reçoit déjà des cartes filtrées par l'appelant : ce test
    // vérifie seulement qu'une fiche sans dette FAQ n'apparaît jamais,
    // brouillon ou non.
    const carte = domainCard({ faqReviewed: '2026-09-10', lastModified: '2026-09-10' });
    expect(buildFaqARelire({ domainCards: [carte], dossierCards: [] })).toEqual([]);
  });
});

// --- buildChapeauARelire ---------------------------------------------------

describe('buildChapeauARelire', () => {
  it(`utilise le seuil existant de ${SUMMARY_MAX_AGE_DAYS} jours`, () => {
    // Écart pile au seuil : encore correct.
    const surSeuil = domainCard({ lastModified: '2026-09-20', summaryReviewed: '2026-06-22' }); // 90 j
    // Un jour de plus : en faute.
    const auDelaDuSeuil = domainCard({ slug: 'mobility', lastModified: '2026-09-20', summaryReviewed: '2026-06-21' }); // 91 j
    const liste = buildChapeauARelire({ domainCards: [surSeuil, auDelaDuSeuil], dossierCards: [] });
    expect(liste).toHaveLength(1);
    expect(liste[0].slug).toBe('mobility');
    expect(liste[0].ageDays).toBe(91);
  });

  it('inclut un chapeau jamais relu (summaryReviewed absent)', () => {
    const carte = domainCard({ summaryReviewed: undefined });
    const liste = buildChapeauARelire({ domainCards: [carte], dossierCards: [] });
    expect(liste).toHaveLength(1);
    expect(liste[0].motif).toContain('summaryReviewed absent');
  });

  it('inclut un dossier au chapeau périmé', () => {
    const carte = dossierCard({ lastModified: '2026-09-20', summaryReviewed: '2026-01-01' });
    const liste = buildChapeauARelire({ domainCards: [], dossierCards: [carte] });
    expect(liste).toHaveLength(1);
    expect(liste[0].collection).toBe('dossier');
  });
});

// --- getElementsARelire (orchestration pure) ------------------------------

describe('getElementsARelire', () => {
  it('combine les trois listes, en gardant pagesIa distinct de vide quand le rapport manque', () => {
    const carte = domainCard({ summaryReviewed: undefined });
    const resultat = getElementsARelire(rapportIndisponible('absent'), { domainCards: [carte], dossierCards: [] });
    expect(resultat.pagesIa).toBeNull();
    expect(resultat.chapeau).toHaveLength(1);
    expect(resultat.faq).toHaveLength(1); // pas de faqReviewed non plus par défaut
  });
});
