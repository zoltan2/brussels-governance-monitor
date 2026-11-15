// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { MagazineConfidence } from './types';

/**
 * Éditions du magazine (spec bgm-ops `2026-11-15-magazine-trilingue-design.md`).
 *
 * Le français est la langue source : il est écrit et validé en premier, à la
 * racine de magazine.governance.brussels (`/sNN/`). Les autres éditions en
 * dérivent et sortent sous `/<langue>/sNN/`. Ajouter une langue = l'ajouter à
 * MAGAZINE_LOCALES, puis remplir STRINGS, CARD_SEGMENTS et la carte de visite :
 * le compilateur et `locales.test.ts` refusent une table incomplète.
 */
export const MAGAZINE_LOCALES = ['fr', 'nl', 'en'] as const;
export type MagazineLocale = (typeof MAGAZINE_LOCALES)[number];
export const SOURCE_LOCALE: MagazineLocale = 'fr';

export const MAGAZINE_BASE = 'https://magazine.governance.brussels';

export function isMagazineLocale(value: string): value is MagazineLocale {
  return (MAGAZINE_LOCALES as readonly string[]).includes(value);
}

/** Dossier de l'édition sous la racine du magazine : '' pour le français, 'nl/' sinon. */
export function editionPrefix(locale: MagazineLocale): string {
  return locale === SOURCE_LOCALE ? '' : `${locale}/`;
}

/** Adresse publique d'un numéro : `/s46/` en français, `/nl/s46/` en néerlandais. */
export function editionUrl(locale: MagazineLocale, weekShort: string): string {
  return `${MAGAZINE_BASE}/${editionPrefix(locale)}${weekShort}/`;
}

export type CardKind = 'domains' | 'dossiers' | 'communes' | 'sectors' | 'solutions' | 'comparisons';

export const CARD_DIRS: Record<CardKind, string> = {
  domains: 'domain-cards',
  dossiers: 'dossiers',
  communes: 'commune-cards',
  sectors: 'sector-cards',
  solutions: 'solution-cards',
  comparisons: 'comparison-cards',
};

/**
 * Segment de route du site par langue et par type de fiche. Copie de
 * `src/i18n/routing.ts`, que ce module ne peut pas importer (le build du
 * magazine tourne hors Next) : `locales.test.ts` compare les deux tables.
 */
export const CARD_SEGMENTS: Record<MagazineLocale, Record<CardKind, string>> = {
  fr: { domains: 'domaines', dossiers: 'dossiers', communes: 'communes', sectors: 'secteurs', solutions: 'solutions', comparisons: 'comparaisons' },
  nl: { domains: 'domeinen', dossiers: 'dossiers', communes: 'gemeenten', sectors: 'sectoren', solutions: 'oplossingen', comparisons: 'vergelijkingen' },
  en: { domains: 'domains', dossiers: 'dossiers', communes: 'municipalities', sectors: 'sectors', solutions: 'solutions', comparisons: 'comparisons' },
};

export interface CardRef {
  locale: MagazineLocale;
  kind: CardKind;
  slug: string;
}

/** `/nl/domeinen/budget` → { locale: 'nl', kind: 'domains', slug: 'budget' } ; null si ce n'est pas une fiche. */
export function cardRefForPath(path: string | undefined): CardRef | null {
  if (!path) return null;
  const cleaned = path.replace(/^https?:\/\/[^/]+/, '').split(/[?#]/)[0] ?? '';
  const m = cleaned.match(/^\/([a-z]{2})\/([^/]+)\/([^/]+)\/?$/);
  if (!m || !isMagazineLocale(m[1]!)) return null;
  const locale = m[1] as MagazineLocale;
  const kind = (Object.keys(CARD_SEGMENTS[locale]) as CardKind[]).find((k) => CARD_SEGMENTS[locale][k] === m[2]);
  if (!kind) return null;
  return { locale, kind, slug: m[3]! };
}

export interface MagazineStrings {
  htmlLang: string;
  ogLocale: string;
  /** Nom de la langue dans le sélecteur d'édition. */
  languageName: string;
  editionsLabel: string;
  confidence: Record<MagazineConfidence, string>;
  /** « Un sujet », « Deux sujets »… jusqu'à douze, puis en chiffres. */
  countLabel(n: number): string;
  cta: Record<'dossiers' | 'domains' | 'communes' | 'sectors' | 'site', string>;
  /** Suite du bouton, espace initiale comprise (« Lire le dossier sur governance.brussels »). */
  ctaSuffix: string;
  siteNote: string;
  statPanelLabel: string;
  nuanceEyebrow: string;
  week(n: string): string;
  backToToc: string;
  pageTitle(n: string): string;
  defaultIntro: string;
  skipToToc: string;
  brandLong: string;
  navLabel: string;
  navToc: string;
  navHowto: string;
  navSite: string;
  coverIssue(n: string): string;
  coverTitle: string;
  place: string;
  explore: string;
  tocEyebrow: string;
  tocTitle: string;
  tocBlurb: string;
  howtoEyebrow: string;
  howtoTitle: string;
  howtoSteps: [string, string, string, string];
  cardEyebrow: string;
  cardTitle: string;
  closingEyebrow: string;
  seeYou: string;
  goToSite: string;
  subscribe: string;
  issueEyebrow: string;
  issueLine(n: string, period: string, count: string): string;
  issueAddress: string;
  footer(publication: string): string;
}

const FR_WORDS = ['', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix', 'Onze', 'Douze'];
const NL_WORDS = ['', 'Eén', 'Twee', 'Drie', 'Vier', 'Vijf', 'Zes', 'Zeven', 'Acht', 'Negen', 'Tien', 'Elf', 'Twaalf'];
const EN_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

export const STRINGS: Record<MagazineLocale, MagazineStrings> = {
  fr: {
    htmlLang: 'fr',
    ogLocale: 'fr_BE',
    languageName: 'Français',
    editionsLabel: 'Éditions',
    confidence: { official: 'Donnée officielle', estimated: 'Estimation', unconfirmed: 'À confirmer' },
    countLabel: (n) => (FR_WORDS[n] ? `${FR_WORDS[n]} sujet${n > 1 ? 's' : ''}` : `${n} sujets`),
    cta: {
      dossiers: 'Lire le dossier',
      domains: 'Explorer le thème',
      communes: 'Voir la commune',
      sectors: 'Voir le secteur',
      site: 'Lire sur le site',
    },
    ctaSuffix: ' sur governance.brussels',
    siteNote: 'Les sources et le détail sont sur la fiche du site.',
    statPanelLabel: 'Le chiffre et sa nuance',
    nuanceEyebrow: 'La nuance qui compte',
    week: (n) => `Semaine ${n}`,
    backToToc: 'Retour au sommaire ↑',
    pageTitle: (n) => `BGM, Bruxelles, derrière les chiffres · Semaine ${n}`,
    defaultIntro: 'Ce qui change. Ce que l’on sait. Et ce que les chiffres ne disent pas.',
    skipToToc: 'Aller au sommaire',
    brandLong: 'Le magazine · ',
    navLabel: 'Navigation du magazine',
    navToc: 'Sommaire',
    navHowto: 'Comment lire',
    navSite: 'Le site ↗',
    coverIssue: (n) => `Le magazine BGM · Semaine ${n}`,
    coverTitle: 'Bruxelles, derrière les chiffres.',
    place: 'Bruxelles',
    explore: 'Explorer les sujets ↓',
    tocEyebrow: 'Cette semaine',
    tocTitle: 'Choisissez votre point d’entrée',
    tocBlurb: 'Chaque sujet tient en une page et vous mène à sa fiche sur governance.brussels.',
    howtoEyebrow: 'Mode d’emploi',
    howtoTitle: 'Comment lire ce magazine',
    howtoSteps: [
      'Chaque sujet commence par ce qui change, puis ce que l’on sait. La nuance, en fin de panneau, dit ce que le chiffre ne mesure pas.',
      'Le statut du chiffre vient du niveau de confiance de la fiche sur le site : donnée officielle, estimation, ou fait encore à confirmer.',
      'Les sources, les dates et le détail ne sont pas ici : ils sont sur la fiche, à un clic, mise à jour quand le fait évolue.',
      'Ce magazine est une porte d’entrée. Le site, lui, suit chaque dossier dans la durée, en quatre langues.',
    ],
    cardEyebrow: 'Qui écrit',
    cardTitle: 'Carte de visite',
    closingEyebrow: 'À suivre',
    seeYou: 'À lundi prochain.',
    goToSite: 'Aller sur governance.brussels',
    subscribe: 'Recevoir le digest',
    issueEyebrow: 'Ce numéro',
    issueLine: (n, period, count) => `Semaine ${n}, ${period}. ${count}.`,
    issueAddress: 'Adresse de ce numéro :',
    footer: (publication) =>
      `Le Signal, le digest et ce magazine sont les publications hebdomadaires de ${publication}, moniteur citoyen indépendant de la gouvernance régionale bruxelloise. Apolitique, factuel, sourcé.`,
  },
  nl: {
    htmlLang: 'nl',
    ogLocale: 'nl_BE',
    languageName: 'Nederlands',
    editionsLabel: 'Edities',
    confidence: { official: 'Officieel gegeven', estimated: 'Schatting', unconfirmed: 'Te bevestigen' },
    countLabel: (n) => (NL_WORDS[n] ? `${NL_WORDS[n]} onderwerp${n > 1 ? 'en' : ''}` : `${n} onderwerpen`),
    cta: {
      dossiers: 'Lees het dossier',
      domains: 'Verken het thema',
      communes: 'Bekijk de gemeente',
      sectors: 'Bekijk de sector',
      site: 'Lees op de site',
    },
    ctaSuffix: ' op governance.brussels',
    siteNote: 'De bronnen en de details staan op de fiche van de site.',
    statPanelLabel: 'Het cijfer en zijn nuance',
    nuanceEyebrow: 'De nuance die telt',
    week: (n) => `Week ${n}`,
    backToToc: 'Terug naar de inhoud ↑',
    pageTitle: (n) => `BGM, Brussel, achter de cijfers · Week ${n}`,
    defaultIntro: 'Wat verandert. Wat we weten. En wat de cijfers niet zeggen.',
    skipToToc: 'Naar de inhoud',
    brandLong: 'Het magazine · ',
    navLabel: 'Navigatie van het magazine',
    navToc: 'Inhoud',
    navHowto: 'Leeswijzer',
    navSite: 'De site ↗',
    coverIssue: (n) => `Het BGM-magazine · Week ${n}`,
    coverTitle: 'Brussel, achter de cijfers.',
    place: 'Brussel',
    explore: 'Ontdek de onderwerpen ↓',
    tocEyebrow: 'Deze week',
    tocTitle: 'Kies waar u begint',
    tocBlurb: 'Elk onderwerp past op één pagina en leidt u naar zijn fiche op governance.brussels.',
    howtoEyebrow: 'Gebruiksaanwijzing',
    howtoTitle: 'Hoe leest u dit magazine',
    howtoSteps: [
      'Elk onderwerp begint met wat verandert, daarna wat we weten. De nuance, onderaan het paneel, zegt wat het cijfer niet meet.',
      'De status van het cijfer komt van het betrouwbaarheidsniveau van de fiche op de site: officieel gegeven, schatting, of feit dat nog bevestigd moet worden.',
      'De bronnen, de data en de details staan niet hier: ze staan op de fiche, één klik verder, bijgewerkt wanneer het feit evolueert.',
      'Dit magazine is een toegangspoort. De site volgt elk dossier op lange termijn, in vier talen.',
    ],
    cardEyebrow: 'Wie schrijft',
    cardTitle: 'Visitekaartje',
    closingEyebrow: 'Vervolg',
    seeYou: 'Tot volgende maandag.',
    goToSite: 'Naar governance.brussels',
    subscribe: 'De digest ontvangen',
    issueEyebrow: 'Dit nummer',
    issueLine: (n, period, count) => `Week ${n}, ${period}. ${count}.`,
    issueAddress: 'Adres van dit nummer:',
    footer: (publication) =>
      `Le Signal, de digest en dit magazine zijn de wekelijkse publicaties van ${publication}, onafhankelijke burgermonitor van het Brusselse gewestelijke bestuur. Apolitiek, feitelijk, met bronnen.`,
  },
  en: {
    htmlLang: 'en',
    ogLocale: 'en_GB',
    languageName: 'English',
    editionsLabel: 'Editions',
    confidence: { official: 'Official figure', estimated: 'Estimate', unconfirmed: 'To be confirmed' },
    countLabel: (n) => (EN_WORDS[n] ? `${EN_WORDS[n]} topic${n > 1 ? 's' : ''}` : `${n} topics`),
    cta: {
      dossiers: 'Read the dossier',
      domains: 'Explore the theme',
      communes: 'See the municipality',
      sectors: 'See the sector',
      site: 'Read on the site',
    },
    ctaSuffix: ' on governance.brussels',
    siteNote: 'Sources and details are on the card on the site.',
    statPanelLabel: 'The figure and its nuance',
    nuanceEyebrow: 'The nuance that matters',
    week: (n) => `Week ${n}`,
    backToToc: 'Back to contents ↑',
    pageTitle: (n) => `BGM, Brussels, behind the figures · Week ${n}`,
    defaultIntro: 'What changes. What we know. And what the figures do not say.',
    skipToToc: 'Skip to contents',
    brandLong: 'The magazine · ',
    navLabel: 'Magazine navigation',
    navToc: 'Contents',
    navHowto: 'How to read',
    navSite: 'The site ↗',
    coverIssue: (n) => `The BGM magazine · Week ${n}`,
    coverTitle: 'Brussels, behind the figures.',
    place: 'Brussels',
    explore: 'Explore the topics ↓',
    tocEyebrow: 'This week',
    tocTitle: 'Choose where to start',
    tocBlurb: 'Each topic fits on one page and takes you to its card on governance.brussels.',
    howtoEyebrow: 'Instructions',
    howtoTitle: 'How to read this magazine',
    howtoSteps: [
      'Each topic starts with what changes, then what we know. The nuance, at the bottom of the panel, says what the figure does not measure.',
      'The status of the figure comes from the confidence level of the card on the site: official figure, estimate, or fact still to be confirmed.',
      'Sources, dates and details are not here: they are on the card, one click away, updated when the fact evolves.',
      'This magazine is a way in. The site follows each dossier over time, in four languages.',
    ],
    cardEyebrow: 'Who writes',
    cardTitle: 'Business card',
    closingEyebrow: 'Next',
    seeYou: 'See you next Monday.',
    goToSite: 'Go to governance.brussels',
    subscribe: 'Get the digest',
    issueEyebrow: 'This issue',
    issueLine: (n, period, count) => `Week ${n}, ${period}. ${count}.`,
    issueAddress: 'Address of this issue:',
    footer: (publication) =>
      `Le Signal, the digest and this magazine are the weekly publications of ${publication}, an independent citizen monitor of Brussels regional governance. Non-partisan, factual, sourced.`,
  },
};
