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
  producteur: 'Eurostat (EU-SILC, jeu ilc_li41 « At-risk-of-poverty rate by NUTS 2 region »)',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_li41/default/table',
  sourceMiseAJour: SOURCE_MISE_A_JOUR_EUROPE,
  extraitLe: EXTRAIT_LE_EUROPE,
  licence: 'Réutilisation autorisée avec mention de la source et des modifications (décision de la Commission du 12/12/2011)',
  modifications: [
    `année ${ANNEE_EUROPE}, taux de risque de pauvreté en % de la population (unité PC)`,
    'rapport taux de la région de la capitale / taux national calculé par BGM, arrondi au centième',
    "pour chaque pays, la région statistique (NUTS 2) qui contient la capitale ; aux Pays-Bas, la province de Hollande-Septentrionale, qui contient Amsterdam",
  ],
  confiance: 'official',
};
