/**
 * Stable editorial identity used by the magazine back cover (business card page).
 * Content changes only when the editorial positioning changes — not weekly.
 */

import type { MagazineLocale } from './locales';

export const AUTHOR = {
  name: 'Zoltán Jánosi',
  manifesto:
    '« Mon métier consiste à rendre lisible la complexité institutionnelle de Bruxelles pour des organisations qui dépendent de ses décisions. Le BGM est le prolongement public de ce travail : chaque semaine, transformer la lasagne institutionnelle en grille lisible pour tout Bruxellois qui veut comprendre, sans filtre ni parti pris. »',
  publication: 'Brussels Governance Monitor',
  publisher: 'Édité par Advice That SRL · Bruxelles',
  offer:
    'Conseil en stratégie · Analyse institutionnelle · Veille sur mesure · Accompagnement personnalisé',
  email: 'contact@brusselsgovernance.be',
  linkedinHandle: 'linkedin.com/in/zoltan',
  linkedinUrl: 'https://linkedin.com/in/zoltan',
  siteBase: 'https://governance.brussels',
} as const;

/**
 * Textes de la carte de visite par édition. Le français est celui d'AUTHOR ;
 * néerlandais et anglais validés par Zoltán le 15/11/2026 (spec magazine
 * trilingue, décision D3). Nom, adresse et liens sont communs.
 */
export const AUTHOR_TEXT: Record<MagazineLocale, { manifesto: string; publisher: string; offer: string }> = {
  fr: { manifesto: AUTHOR.manifesto, publisher: AUTHOR.publisher, offer: AUTHOR.offer },
  nl: {
    manifesto:
      '« Mijn werk bestaat erin de institutionele complexiteit van Brussel leesbaar te maken voor organisaties die van haar beslissingen afhangen. De BGM is het publieke verlengstuk van dat werk: elke week de institutionele lasagne omzetten in een leesbaar raster voor elke Brusselaar die wil begrijpen, zonder filter of vooringenomenheid. »',
    publisher: 'Uitgegeven door Advice That SRL · Brussel',
    offer: 'Strategisch advies · Institutionele analyse · Monitoring op maat · Persoonlijke begeleiding',
  },
  en: {
    manifesto:
      '“My job is to make Brussels’ institutional complexity readable for organisations that depend on its decisions. The BGM is the public extension of that work: every week, turning the institutional lasagne into a readable grid for any Brussels resident who wants to understand, with no filter and no bias.”',
    publisher: 'Published by Advice That SRL · Brussels',
    offer: 'Strategy consulting · Institutional analysis · Tailored monitoring · Personal guidance',
  },
};
