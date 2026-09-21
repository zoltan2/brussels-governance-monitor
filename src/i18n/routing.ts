// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['de', 'en', 'fr', 'nl'],
  defaultLocale: 'fr',
  localePrefix: 'always',
  // next-intl publiait ses propres annotations hreflang en EN-TETE HTTP, en plus
  // de celles que les pages publient en HTML via buildMetadata. Les deux se
  // contredisaient : l'en-tete annoncait un x-default SANS prefixe de langue
  // (`https://governance.brussels/comprendre/cocof`), qui repond 307, alors que
  // le HTML annonce la bonne URL en 200. Une annotation hreflang vers une
  // redirection est invalide et peut faire ignorer tout le groupe, ou faire
  // indexer l'URL sans prefixe a la place de la canonique. C'est le mecanisme
  // derriere l'indexation de /comprendre/cocof via une 307 (audit 21/09).
  // Les pages gardent leurs alternates HTML, qui sont corrects et complets.
  alternateLinks: false,
  pathnames: {
    '/': '/',
    '/timeline': {
      fr: '/chronologie',
      nl: '/chronologie',
      en: '/timeline',
      de: '/chronologie',
    },
    '/glossary': {
      fr: '/glossaire',
      nl: '/woordenlijst',
      en: '/glossary',
      de: '/glossar',
    },
    '/faq': '/faq',
    '/data': {
      fr: '/donnees',
      nl: '/gegevens',
      en: '/data',
      de: '/daten',
    },
    '/methodology': {
      fr: '/methodologie',
      nl: '/methodologie',
      en: '/methodology',
      de: '/methodik',
    },
    '/editorial': {
      fr: '/charte-editoriale',
      nl: '/redactioneel-charter',
      en: '/editorial-charter',
      de: '/redaktionelle-charta',
    },
    '/privacy': {
      fr: '/confidentialite',
      nl: '/privacy',
      en: '/privacy',
      de: '/datenschutz',
    },
    '/legal': {
      fr: '/mentions-legales',
      nl: '/juridisch',
      en: '/legal',
      de: '/impressum',
    },
    '/domains': {
      fr: '/domaines',
      nl: '/domeinen',
      en: '/domains',
      de: '/bereiche',
    },
    '/domains/[slug]': {
      fr: '/domaines/[slug]',
      nl: '/domeinen/[slug]',
      en: '/domains/[slug]',
      de: '/bereiche/[slug]',
    },
    '/solutions': {
      fr: '/solutions',
      nl: '/oplossingen',
      en: '/solutions',
      de: '/loesungen',
    },
    '/solutions/[slug]': {
      fr: '/solutions/[slug]',
      nl: '/oplossingen/[slug]',
      en: '/solutions/[slug]',
      de: '/loesungen/[slug]',
    },
    '/sectors': {
      fr: '/secteurs',
      nl: '/sectoren',
      en: '/sectors',
      de: '/sektoren',
    },
    '/sectors/[slug]': {
      fr: '/secteurs/[slug]',
      nl: '/sectoren/[slug]',
      en: '/sectors/[slug]',
      de: '/sektoren/[slug]',
    },
    // Les fiches de vérification existaient depuis février 2026, avec un
    // `permalink` calculé au schéma, et aucune route ne les servait : elles
    // répondaient 404. Publiées le 21/09/2026.
    '/verifications/[slug]': {
      fr: '/verifications/[slug]',
      nl: '/verificaties/[slug]',
      en: '/verifications/[slug]',
      de: '/ueberpruefungen/[slug]',
    },
    '/comparisons': {
      fr: '/comparaisons',
      nl: '/vergelijkingen',
      en: '/comparisons',
      de: '/vergleiche',
    },
    '/comparisons/[slug]': {
      fr: '/comparaisons/[slug]',
      nl: '/vergelijkingen/[slug]',
      en: '/comparisons/[slug]',
      de: '/vergleiche/[slug]',
    },
    '/understand': {
      fr: '/comprendre',
      nl: '/begrijpen',
      en: '/understand',
      de: '/verstehen',
    },
    '/explainers/levels-of-power': {
      fr: '/comprendre/niveaux-de-pouvoir',
      nl: '/begrijpen/machtsniveaus',
      en: '/explainers/levels-of-power',
      de: '/erklaerungen/machtebenen',
    },
    '/explainers/parliament-powers': {
      fr: '/comprendre/pouvoirs-du-parlement',
      nl: '/begrijpen/parlementaire-bevoegdheden',
      en: '/explainers/parliament-powers',
      de: '/erklaerungen/parlamentsbefugnisse',
    },
    '/explainers/brussels-paradox': {
      fr: '/comprendre/paradoxe-bruxellois',
      nl: '/begrijpen/brusselse-paradox',
      en: '/explainers/brussels-paradox',
      de: '/erklaerungen/bruesseler-paradoxon',
    },
    '/explainers/government-formation': {
      fr: '/comprendre/formation-du-gouvernement',
      nl: '/begrijpen/regeringsvorming',
      en: '/explainers/government-formation',
      de: '/erklaerungen/regierungsbildung',
    },
    '/explainers/brussels-overview': {
      fr: '/comprendre/bruxelles-en-bref',
      nl: '/begrijpen/brussel-in-het-kort',
      en: '/explainers/brussels-overview',
      de: '/erklaerungen/bruessel-auf-einen-blick',
    },
    '/explainers/brussels-cosmopolitan': {
      fr: '/comprendre/bruxelles-cosmopolite',
      nl: '/begrijpen/kosmopolitisch-brussel',
      en: '/explainers/brussels-cosmopolitan',
      de: '/erklaerungen/kosmopolitisches-bruessel',
    },
    '/explainers/brussels-region': {
      fr: '/comprendre/region-bruxelles',
      nl: '/begrijpen/brussels-gewest',
      en: '/explainers/brussels-region',
      de: '/erklaerungen/region-bruessel',
    },
    '/explainers/cocom': {
      fr: '/comprendre/cocom',
      nl: '/begrijpen/ggc',
      en: '/explainers/cocom',
      de: '/erklaerungen/ggk',
    },
    '/explainers/cocof': {
      fr: '/comprendre/cocof',
      nl: '/begrijpen/fgc',
      en: '/explainers/cocof',
      de: '/erklaerungen/cocof',
    },
    '/explainers/vgc': {
      fr: '/comprendre/vgc',
      nl: '/begrijpen/vgc',
      en: '/explainers/vgc',
      de: '/erklaerungen/vgc',
    },
    '/explainers/communities-in-brussels': {
      fr: '/comprendre/communautes-a-bruxelles',
      nl: '/begrijpen/gemeenschappen-in-brussel',
      en: '/explainers/communities-in-brussels',
      de: '/erklaerungen/gemeinschaften-in-bruessel',
    },
    '/explainers/federal-and-brussels': {
      fr: '/comprendre/federal-et-bruxelles',
      nl: '/begrijpen/federaal-en-brussel',
      en: '/explainers/federal-and-brussels',
      de: '/erklaerungen/bund-und-bruessel',
    },
    '/explainers/who-decides-what': {
      fr: '/comprendre/qui-decide-quoi',
      nl: '/begrijpen/wie-beslist-wat',
      en: '/explainers/who-decides-what',
      de: '/erklaerungen/wer-entscheidet-was',
    },
    '/explainers/vice-gouverneur': {
      fr: '/comprendre/vice-gouverneur',
      nl: '/begrijpen/vicegouverneur',
      en: '/explainers/vice-governor',
      de: '/erklaerungen/vizegouverneur',
    },
    '/how-to-read': {
      fr: '/comment-lire-ce-site',
      nl: '/hoe-deze-site-lezen',
      en: '/how-to-read',
      de: '/wie-diese-seite-lesen',
    },
    '/changelog': {
      fr: '/mises-a-jour',
      nl: '/wijzigingen',
      en: '/changelog',
      de: '/aenderungen',
    },
    '/transparency': {
      fr: '/transparence',
      nl: '/transparantie',
      en: '/transparency',
      de: '/transparenz',
    },
    '/accessibility': {
      fr: '/accessibilite',
      nl: '/toegankelijkheid',
      en: '/accessibility',
      de: '/barrierefreiheit',
    },
    '/communes': {
      fr: '/communes',
      nl: '/gemeenten',
      en: '/municipalities',
      de: '/gemeinden',
    },
    '/communes/[slug]': {
      fr: '/communes/[slug]',
      nl: '/gemeenten/[slug]',
      en: '/municipalities/[slug]',
      de: '/gemeinden/[slug]',
    },
    '/dashboard': {
      fr: '/engagements',
      nl: '/engagementen',
      en: '/commitments',
      de: '/verpflichtungen',
    },
    '/about': {
      fr: '/a-propos',
      nl: '/over-ons',
      en: '/about',
      de: '/ueber-uns',
    },
    '/radar': '/radar',
    '/dossiers': '/dossiers',
    '/dossiers/[slug]': '/dossiers/[slug]',
    '/archives/[slug]': {
      fr: '/archives/[slug]',
      nl: '/archief/[slug]',
      en: '/archives/[slug]',
      de: '/archiv/[slug]',
    },
    '/press': {
      fr: '/presse',
      nl: '/pers',
      en: '/press',
      de: '/presse',
    },
    '/support': {
      fr: '/soutenir',
      nl: '/steunen',
      en: '/support',
      de: '/unterstuetzen',
    },
    '/quiz': '/quiz',
    '/signal': '/signal',
    // `/subscribe` manquait a cette table. `buildMetadata` resout le chemin via
    // `getPathname` : sans entree, l'appel sans `path` retombait sur `/${locale}`
    // et la page d'abonnement des quatre langues declarait la PAGE D'ACCUEIL
    // comme canonique. Elle ne pouvait donc jamais etre indexee, et tout son
    // signal etait consolide sur l'accueil (audit 21/09).
    '/subscribe': '/subscribe',
    '/refonte': '/refonte',
    '/refonte/preview/mosaique': '/refonte/preview/mosaique',
    '/refonte/preview/thermometre': '/refonte/preview/thermometre',
    '/refonte/preview/texte-fort': '/refonte/preview/texte-fort',
    '/refonte/preview/multilingue': '/refonte/preview/multilingue',
  },
});

export type Locale = (typeof routing.locales)[number];
