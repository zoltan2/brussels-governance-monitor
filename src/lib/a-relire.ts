// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * « Qu'est-ce qui mérite d'être relu ? »
 *
 * L'écran /review liste les fiches `draft: true`. Aucune fiche du dépôt n'en
 * porte : une veille enrichit des fiches déjà publiées au lieu d'en créer, la
 * liste est vide depuis toujours et le restera. L'éditeur n'a pourtant aucun
 * endroit qui réponde à la vraie question, alors que trois signaux existent
 * déjà ailleurs dans le dépôt :
 *
 * 1. Les pages que les assistants IA citent mais que personne n'a mises à
 *    jour (règle `page-ia-perimee` du rapport SEO, src/lib/seo-report.ts).
 * 2. Les FAQ republiées sans relecture (src/lib/faq-review.ts).
 * 3. Les chapeaux (`summary`) laissés à pourrir au-delà du seuil
 *    (src/lib/summary-freshness.ts, SUMMARY_MAX_AGE_DAYS).
 * 4. Les vérifications dont l'échéance est dépassée : `nextVerification` du
 *    registre, ou `lastVerified` + `verificationIntervalDays` d'une fiche
 *    (src/lib/verification-due.ts, même règle que le content-lint
 *    scripts/content-lint/verification-overdue.ts).
 *
 * Ce module se contente d'assembler ces trois signaux déjà calculés
 * ailleurs ; il n'invente aucune règle de fraîcheur. Les fonctions
 * `build*` sont pures (aucun accès disque, aucun import Next.js), pour rester
 * testables sans tirer le runtime ; seul `chargerElementsARelire` fait de
 * l'I/O (lecture du rapport SEO, collections Velite).
 *
 * Chaque élément porte un identifiant stable (collection, langue, slug) :
 * rien ne s'y accroche aujourd'hui, mais un futur bouton « marquer comme
 * relu » doit pouvoir s'y brancher sans qu'on refasse ce calcul.
 */

import { checkFaqReview, type FaqReviewVerdict } from './faq-review';
import { jourISO } from './velite-date';
import { checkSummaryFreshness, SUMMARY_MAX_AGE_DAYS } from './summary-freshness';
import { aujourdhuiBruxelles, bilanEcheances } from './verification-due';
import {
  gscMesurePresente,
  readSeoReport,
  type ActionSuggeree,
  type RapportSeo,
} from './seo-report';
import { chemin } from './utils';
import {
  getAllVerifications,
  getLocalizedSlug,
  getPublishedDomainCards,
  getPublishedDossierCards,
  idDeVerification,
  type DomainCard,
  type DossierCard,
  type Verification,
} from './content';
import type { Locale } from '@/i18n/routing';

export { SUMMARY_MAX_AGE_DAYS };

export type CollectionARelire = 'domain' | 'dossier' | 'inconnue';

export interface ElementARelire {
  /** `${collection}:${locale}:${slug}`, stable d'un calcul à l'autre. */
  id: string;
  collection: CollectionARelire;
  slug: string;
  locale: string;
  /** Null quand la fiche correspondante n'a pas pu être identifiée. */
  titre: string | null;
  motif: string;
  /** Null quand l'âge n'est pas calculable (donnée absente ou illisible). */
  ageDays: number | null;
  lien: string;
  /** Null quand le fichier source n'a pas pu être identifié avec certitude. */
  cheminFichier: string | null;
}

export interface ElementsARelire {
  /** Null = rapport SEO absent ou illisible (distinct d'une liste vide). */
  pagesIa: ElementARelire[] | null;
  faq: ElementARelire[];
  chapeau: ElementARelire[];
  /** Vérifications dont l'échéance est dépassée (registre et fiches). */
  verifications: ElementARelire[];
}

interface Cartes {
  domainCards: DomainCard[];
  dossierCards: DossierCard[];
}

const LOCALES_CONNUES: readonly Locale[] = ['fr', 'nl', 'en', 'de'];

function estLocaleConnue(v: string): v is Locale {
  return (LOCALES_CONNUES as readonly string[]).includes(v);
}

// Duplique src/i18n/routing.ts (`/domains/[slug]`) : DomainCard ne porte
// pas de localizedSlugs, seul le mot du chemin change selon la langue (le
// slug, lui, ne change jamais). Si routing.ts change ce mot, ce tableau
// doit suivre.
const MOT_CHEMIN_DOMAINES: Record<Locale, string> = {
  fr: 'domaines',
  nl: 'domeinen',
  en: 'domains',
  de: 'bereiche',
};

// `/dossiers/[slug]` n'est pas traduit dans routing.ts : seul le slug (via
// localizedSlugs) change selon la langue.
const MOT_CHEMIN_DOSSIERS = 'dossiers';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseISODate(value: string): number | null {
  if (!ISO_DATE.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

function todayMs(today?: string): number | null {
  return today ? parseISODate(today) : Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
}

/** Nombre de jours écoulés depuis `dateStr`, jamais négatif. Null si l'une
 * des deux dates est absente ou illisible : jamais un zéro inventé. */
function joursDepuis(dateStr: string | undefined, today?: string): number | null {
  if (!dateStr) return null;
  const ms = parseISODate(dateStr);
  if (ms === null) return null;
  const now = todayMs(today);
  if (now === null) return null;
  return Math.max(0, Math.floor((now - ms) / 86_400_000));
}

function identifiant(collection: CollectionARelire, locale: string, slug: string): string {
  return `${collection}:${locale}:${slug}`;
}

function trouverDomaine(cartes: DomainCard[], locale: string, slug: string): DomainCard | undefined {
  return (
    cartes.find((c) => c.locale === locale && c.slug === slug) ??
    // Repli FR : la page publiée à cette URL montre le contenu FR faute de
    // traduction, c'est donc bien cette fiche qui doit être relue.
    cartes.find((c) => c.locale === 'fr' && c.slug === slug)
  );
}

function trouverDossier(cartes: DossierCard[], locale: string, slug: string): DossierCard | undefined {
  return (
    cartes.find((c) => c.locale === locale && getLocalizedSlug(c, locale as Locale) === slug) ??
    cartes.find((c) => c.locale === 'fr' && getLocalizedSlug(c, 'fr') === slug)
  );
}

function construireElementPageIa(action: ActionSuggeree, cartes: Cartes, today?: string): ElementARelire {
  const cheminUrl = chemin(action.url);
  const segments = cheminUrl.split('/').filter(Boolean);
  const localeSegment = segments[0];
  const section = segments[1];
  const slugSegment = segments.slice(2).join('/');

  if (localeSegment && estLocaleConnue(localeSegment) && section) {
    if (section === MOT_CHEMIN_DOMAINES[localeSegment]) {
      const carte = trouverDomaine(cartes.domainCards, localeSegment, slugSegment);
      if (carte) {
        return {
          id: identifiant('domain', carte.locale, carte.slug),
          collection: 'domain',
          slug: carte.slug,
          locale: carte.locale,
          titre: carte.title,
          motif: action.preuve,
          ageDays: joursDepuis(carte.lastModified, today),
          lien: action.url,
          cheminFichier: `content/domain-cards/${carte.slug}.${carte.locale}.mdx`,
        };
      }
    }
    if (section === MOT_CHEMIN_DOSSIERS) {
      const carte = trouverDossier(cartes.dossierCards, localeSegment, slugSegment);
      if (carte) {
        return {
          id: identifiant('dossier', carte.locale, carte.slug),
          collection: 'dossier',
          slug: carte.slug,
          locale: carte.locale,
          titre: carte.title,
          motif: action.preuve,
          ageDays: joursDepuis(carte.lastModified, today),
          lien: action.url,
          cheminFichier: `content/dossiers/${carte.slug}.${carte.locale}.mdx`,
        };
      }
    }
  }

  // Page hors domaines/dossiers, ou fiche introuvable dans la collection :
  // regles.mjs a bien vu la page citée par un assistant, ce signal ne doit
  // pas disparaître. On ne devine ni âge ni fichier qu'on ne peut pas
  // prouver : indisponible, pas zéro.
  const slugRepli = slugSegment || cheminUrl;
  return {
    id: identifiant('inconnue', localeSegment && estLocaleConnue(localeSegment) ? localeSegment : 'inconnue', slugRepli),
    collection: 'inconnue',
    slug: slugRepli,
    locale: localeSegment && estLocaleConnue(localeSegment) ? localeSegment : 'inconnue',
    titre: null,
    motif: action.preuve,
    ageDays: null,
    lien: action.url,
    cheminFichier: null,
  };
}

/**
 * Pages citées par les assistants IA et jamais mises à jour depuis.
 *
 * Null quand le rapport SEO est absent, en panne ou sans la moindre mesure
 * exploitable (même logique que la tuile et la page /admin/rapport, voir
 * gscMesurePresente) : « rapport indisponible » et « aucune page à relire »
 * sont deux phrases différentes, ce module ne doit jamais confondre les deux.
 */
export function buildPagesIaPerimees(
  rapport: RapportSeo,
  cartes: Cartes,
  today?: string,
): ElementARelire[] | null {
  const gsc = rapport.blocs.gsc;
  const utilisable = gsc.status === 'ok' && !!gsc.donnees && gscMesurePresente(gsc.donnees);
  if (!utilisable) return null;

  return gsc
    .donnees!.actions.filter((a) => a.regle === 'page-ia-perimee')
    .map((a) => construireElementPageIa(a, cartes, today));
}

function construireLien(collection: 'domain' | 'dossier', locale: Locale, carte: DomainCard | DossierCard): string {
  if (collection === 'domain') return `/${locale}/${MOT_CHEMIN_DOMAINES[locale]}/${carte.slug}`;
  const slugLocalise = getLocalizedSlug(carte as DossierCard, locale);
  return `/${locale}/${MOT_CHEMIN_DOSSIERS}/${slugLocalise}`;
}

/** Âge du même style que checkSummaryFreshness (modified - reviewed), mais
 * appliqué à faqReviewed, qui n'expose pas d'âge : checkFaqReview ne rend
 * qu'un verdict et une raison. Sans faqReviewed du tout, on ne peut pas
 * dater une relecture qui n'a jamais eu lieu : l'âge devient « depuis
 * combien de jours la fiche attend », c'est-à-dire depuis lastModified. */
function ageFaq(
  verdict: FaqReviewVerdict,
  lastModified: string | undefined,
  faqReviewed: string | undefined,
  today?: string,
): number | null {
  if (verdict === 'missing') return joursDepuis(lastModified, today);
  if (verdict === 'stale') {
    if (!lastModified || !faqReviewed) return null;
    const modified = parseISODate(lastModified);
    const reviewed = parseISODate(faqReviewed);
    if (modified === null || reviewed === null) return null;
    return Math.max(0, Math.floor((modified - reviewed) / 86_400_000));
  }
  // future / unparsable : un âge n'aurait pas de sens ici.
  return null;
}

interface SpecCollection {
  collection: 'domain' | 'dossier';
  dir: string;
  cartes: (DomainCard | DossierCard)[];
}

function specs(cartes: Cartes): SpecCollection[] {
  return [
    { collection: 'domain', dir: 'content/domain-cards', cartes: cartes.domainCards },
    { collection: 'dossier', dir: 'content/dossiers', cartes: cartes.dossierCards },
  ];
}

/**
 * Fiches republiées (`lastModified`) dont la FAQ n'a pas suivi :
 * `faqReviewed` antérieur à `lastModified`, ou absent alors que la fiche a
 * été republiée. Voir src/lib/faq-review.ts pour la règle elle-même.
 */
export function buildFaqARelire(cartes: Cartes, today?: string): ElementARelire[] {
  const elements: ElementARelire[] = [];
  for (const spec of specs(cartes)) {
    for (const carte of spec.cartes) {
      // ⚑ Velite rend un horodatage complet, jamais `AAAA-MM-JJ`. Sans ce
      // passage, chaque fiche tombe en verdict `unparsable` et l'écran les
      // liste TOUTES. Voir src/lib/velite-date.ts.
      const lastModified = jourISO(carte.lastModified);
      const faqReviewed = jourISO(carte.faqReviewed);
      const verdict = checkFaqReview({ lastModified, faqReviewed, today });
      if (verdict.verdict === 'ok') continue;
      elements.push({
        id: identifiant(spec.collection, carte.locale, carte.slug),
        collection: spec.collection,
        slug: carte.slug,
        locale: carte.locale,
        titre: carte.title,
        motif: verdict.reason,
        ageDays: ageFaq(verdict.verdict, lastModified, faqReviewed, today),
        lien: construireLien(spec.collection, carte.locale, carte),
        cheminFichier: `${spec.dir}/${carte.slug}.${carte.locale}.mdx`,
      });
    }
  }
  return elements.sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1));
}

/**
 * Chapeaux (`summary`) relus il y a plus de SUMMARY_MAX_AGE_DAYS jours, ou
 * jamais relus. Réutilise checkSummaryFreshness (src/lib/summary-freshness.ts)
 * telle quelle : même seuil que scripts/content-lint/summary-freshness.ts,
 * jamais un second seuil inventé ici.
 */
export function buildChapeauARelire(cartes: Cartes, today?: string): ElementARelire[] {
  const elements: ElementARelire[] = [];
  for (const spec of specs(cartes)) {
    for (const carte of spec.cartes) {
      // ⚑ Même normalisation que pour la FAQ : voir src/lib/velite-date.ts.
      const verdict = checkSummaryFreshness({
        lastModified: jourISO(carte.lastModified),
        summaryReviewed: jourISO(carte.summaryReviewed),
        today,
      });
      if (verdict.verdict === 'ok') continue;
      elements.push({
        id: identifiant(spec.collection, carte.locale, carte.slug),
        collection: spec.collection,
        slug: carte.slug,
        locale: carte.locale,
        titre: carte.title,
        motif: verdict.reason,
        ageDays: verdict.ageDays,
        lien: construireLien(spec.collection, carte.locale, carte),
        cheminFichier: `${spec.dir}/${carte.slug}.${carte.locale}.mdx`,
      });
    }
  }
  return elements.sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1));
}

/**
 * Vérifications dont l'échéance est dépassée. La règle (dernière vérification
 * par fiche, échéance strictement antérieure au jour) vit dans
 * src/lib/verification-due.ts, partagée avec le content-lint : jamais une
 * seconde règle ici. Une date illisible n'est pas en retard, elle est
 * signalée par le lint, qui échoue dessus.
 */
export function buildVerificationsEnRetard(
  cartes: Cartes,
  verifications: Verification[],
  today?: string,
): ElementARelire[] {
  const aujourdhui = today ?? aujourdhuiBruxelles();
  const parFichier = new Map<string, DomainCard | DossierCard>();
  for (const spec of specs(cartes)) {
    for (const carte of spec.cartes) parFichier.set(`${spec.dir}/${carte.slug}.${carte.locale}.mdx`, carte);
  }
  const bilan = bilanEcheances({
    aujourdhui,
    // ⚑ Dates Velite : horodatages complets, ramenés au jour par
    // bilanEcheances (jourISO). Voir src/lib/velite-date.ts.
    verifications: verifications.map((v) => ({
      fichier: `${idDeVerification(v)}:${v.locale}`,
      cardType: v.cardType,
      cardSlug: v.cardSlug,
      locale: v.locale,
      date: v.date,
      nextVerification: v.nextVerification,
    })),
    fiches: specs(cartes).flatMap((spec) =>
      spec.cartes.map((carte) => ({
        fichier: `${spec.dir}/${carte.slug}.${carte.locale}.mdx`,
        collection: spec.collection,
        slug: carte.slug,
        locale: carte.locale,
        title: carte.title,
        lastVerified: carte.lastVerified,
        verificationIntervalDays: carte.verificationIntervalDays,
      })),
    ),
  });

  const elements: ElementARelire[] = [];
  for (const v of bilan.verificationsEnRetard) {
    const [idVerif, locale] = v.fichier.split(':');
    const domaine =
      v.cardType === 'domain' ? trouverDomaine(cartes.domainCards, locale, v.cardSlug) : undefined;
    elements.push({
      id: identifiant(v.cardType === 'domain' ? 'domain' : 'inconnue', locale, v.cardSlug),
      collection: v.cardType === 'domain' ? 'domain' : 'inconnue',
      slug: v.cardSlug,
      locale,
      titre: domaine?.title ?? null,
      motif: `Prochaine vérification prévue le ${v.echeance}, non faite (dernière vérification le ${v.date}). Revérifier les faits contre les sources, puis enregistrer une nouvelle vérification.`,
      ageDays: v.joursDeRetard,
      lien: `/${locale}/verifications/${idVerif}`,
      // Le nom du fichier source n'est pas porté par Velite : on ne le devine pas.
      cheminFichier: null,
    });
  }
  for (const f of bilan.fichesEnRetard) {
    const carte = parFichier.get(f.fichier);
    elements.push({
      id: identifiant(f.collection, f.locale, f.slug),
      collection: f.collection,
      slug: f.slug,
      locale: f.locale,
      titre: f.title ?? null,
      motif: `Vérifiée le ${f.lastVerified}, à revérifier tous les ${f.intervalDays} jours : échéance du ${f.echeance} dépassée. Relire les faits contre les sources, puis poser lastVerified au jour de la relecture.`,
      ageDays: f.joursDeRetard,
      lien: carte ? construireLien(f.collection, f.locale as Locale, carte) : '',
      cheminFichier: f.fichier,
    });
  }
  return elements.sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1));
}

/**
 * Assemble les quatre listes. Pure (aucune I/O) : orchestrateur testable
 * séparément du chargement des données réelles (chargerElementsARelire).
 */
export function getElementsARelire(
  rapport: RapportSeo,
  cartes: Cartes,
  verifications: Verification[],
  today?: string,
): ElementsARelire {
  return {
    pagesIa: buildPagesIaPerimees(rapport, cartes, today),
    faq: buildFaqARelire(cartes, today),
    chapeau: buildChapeauARelire(cartes, today),
    verifications: buildVerificationsEnRetard(cartes, verifications, today),
  };
}

/**
 * Charge les données réelles (rapport SEO déposé par le VPS, collections
 * Velite) et calcule les trois listes. Seule fonction de ce module qui fait
 * de l'I/O ; toute la logique vit dans les fonctions pures ci-dessus.
 */
export async function chargerElementsARelire(today?: string): Promise<ElementsARelire> {
  const rapport = await readSeoReport();
  const cartes: Cartes = {
    domainCards: getPublishedDomainCards(),
    dossierCards: getPublishedDossierCards(),
  };
  return getElementsARelire(rapport, cartes, getAllVerifications(), today);
}
