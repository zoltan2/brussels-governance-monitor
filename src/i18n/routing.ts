import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['de', 'en', 'fr', 'nl'],
  defaultLocale: 'fr',
  localePrefix: 'always',
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
    '/domains/[slug]': {
      fr: '/domaines/[slug]',
      nl: '/domeinen/[slug]',
      en: '/domains/[slug]',
      de: '/bereiche/[slug]',
    },
    '/solutions/[slug]': {
      fr: '/solutions/[slug]',
      nl: '/oplossingen/[slug]',
      en: '/solutions/[slug]',
      de: '/loesungen/[slug]',
    },
    '/sectors/[slug]': {
      fr: '/secteurs/[slug]',
      nl: '/sectoren/[slug]',
      en: '/sectors/[slug]',
      de: '/sektoren/[slug]',
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
    '/how-to-read': {
      fr: '/comment-lire-ce-site',
      nl: '/hoe-deze-site-lezen',
      en: '/how-to-read',
      de: '/wie-diese-seite-lesen',
    },
  },
});

export type Locale = (typeof routing.locales)[number];
