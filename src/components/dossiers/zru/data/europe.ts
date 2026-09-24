// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// Écrit à la main : libellés et provenance des rapports région de la capitale / pays (valeurs dans europe-brut.ts).

import { ANNEE_EUROPE, EUROPE_RATIOS_BRUTS, EXTRAIT_LE_EUROPE, SOURCE_MISE_A_JOUR_EUROPE } from './europe-brut';
import type { Locale, Provenance } from './types';

const NOMS: Record<string, Record<Locale, string>> = {
  BE10: { fr: 'Bruxelles', nl: 'Brussel', en: 'Brussels', de: 'Brüssel' },
  AT13: { fr: 'Vienne', nl: 'Wenen', en: 'Vienna', de: 'Wien' },
  DE30: { fr: 'Berlin', nl: 'Berlijn', en: 'Berlin', de: 'Berlin' },
  FR10: { fr: 'Île-de-France', nl: 'Île-de-France', en: 'Île-de-France', de: 'Île-de-France' },
  NL32: { fr: 'Hollande-Septentrionale', nl: 'Noord-Holland', en: 'North Holland', de: 'Nordholland' },
  CZ01: { fr: 'Prague', nl: 'Praag', en: 'Prague', de: 'Prag' },
  DK01: { fr: 'Région de Copenhague', nl: 'Regio Kopenhagen', en: 'Capital Region of Denmark', de: 'Region Hovedstaden' },
  SE11: { fr: 'Stockholm', nl: 'Stockholm', en: 'Stockholm', de: 'Stockholm' },
  ES30: { fr: 'Madrid', nl: 'Madrid', en: 'Madrid', de: 'Madrid' },
  PT1A: { fr: 'Grande Lisbonne', nl: 'Groot-Lissabon', en: 'Greater Lisbon', de: 'Großraum Lissabon' },
};

export { ANNEE_EUROPE };

export const EUROPE_RATIOS: {
  geo: string;
  pays: string;
  nom: Record<Locale, string>;
  region: number;
  nation: number;
  ratio: number;
}[] = EUROPE_RATIOS_BRUTS.map((r) => {
  const nom = NOMS[r.geo];
  if (!nom) throw new Error(`europe : libellé manquant pour ${r.geo}`);
  return { ...r, nom };
});

export const PROVENANCE_EUROPE: Provenance = {
  producteur: { fr: 'Eurostat', nl: 'Eurostat', en: 'Eurostat', de: 'Eurostat' },
  url: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_li41/default/table',
  sourceMiseAJour: SOURCE_MISE_A_JOUR_EUROPE,
  extraitLe: EXTRAIT_LE_EUROPE,
  licence: {
    fr: 'réutilisation autorisée avec mention de la source et des modifications (décision de la Commission du 12/12/2011)',
    nl: 'hergebruik toegestaan met vermelding van de bron en van de wijzigingen (besluit van de Commissie van 12/12/2011)',
    en: 'reuse authorised with acknowledgement of the source and of the changes (Commission Decision of 12/12/2011)',
    de: 'Weiterverwendung gestattet mit Angabe der Quelle und der Änderungen (Beschluss der Kommission vom 12.12.2011)',
  },
  modifications: {
    fr: [
      'jeu EU-SILC ilc_li41 (« At-risk-of-poverty rate by NUTS 2 region »)',
      `année ${ANNEE_EUROPE}, taux de risque de pauvreté en\u00a0% de la population (unité PC)`,
      'rapport taux de la région de la capitale / taux national calculé par BGM, arrondi au centième',
      'pour chaque pays, la région statistique (NUTS 2) qui contient la capitale\u00a0; aux Pays-Bas, la province de Hollande-Septentrionale, qui contient Amsterdam',
    ],
    nl: [
      'EU-SILC-dataset ilc_li41 (‘At-risk-of-poverty rate by NUTS 2 region’)',
      `jaar ${ANNEE_EUROPE}, armoederisicograad in % van de bevolking (eenheid PC)`,
      'verhouding tussen het cijfer van de regio van de hoofdstad en het nationale cijfer, berekend door BGM, afgerond op twee decimalen',
      'voor elk land de statistische regio (NUTS 2) die de hoofdstad bevat; in Nederland de provincie Noord-Holland, waarin Amsterdam ligt',
    ],
    en: [
      'EU-SILC dataset ilc_li41 (‘At-risk-of-poverty rate by NUTS 2 region’)',
      `year ${ANNEE_EUROPE}, at-risk-of-poverty rate as a % of the population (unit PC)`,
      'ratio of the rate of the capital’s region to the national rate, calculated by BGM, rounded to two decimals',
      'for each country, the statistical region (NUTS 2) containing the capital; in the Netherlands, the province of North Holland, which contains Amsterdam',
    ],
    de: [
      'EU-SILC-Datensatz ilc_li41 („At-risk-of-poverty rate by NUTS 2 region“)',
      `Jahr ${ANNEE_EUROPE}, Armutsgefährdungsquote in % der Bevölkerung (Einheit PC)`,
      'Verhältnis der Quote der Region der Hauptstadt zur Landesquote, berechnet von BGM, auf zwei Dezimalstellen gerundet',
      'für jedes Land die statistische Region (NUTS 2), die die Hauptstadt enthält; in den Niederlanden die Provinz Nordholland, die Amsterdam enthält',
    ],
  },
  confiance: 'official',
};
