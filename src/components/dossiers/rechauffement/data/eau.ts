// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { HeatCounter, Locale } from './heat';

/** Titre de la rangee de compteurs eau, par locale */
export const EAU_COUNTERS_CAPTION: Record<Locale, string> = {
  fr: "Chiffres clés - l'eau à Bruxelles",
  nl: 'Kerncijfers - water in Brussel',
  en: 'Key figures - water in Brussels',
  de: 'Kennzahlen - Wasser in Brüssel',
};

export const EAU_COUNTERS: HeatCounter[] = [
  {
    id: 'captages-souterrains',
    valeur: { fr: 'environ 150', nl: 'ongeveer 150', en: 'about 150', de: 'rund 150' },
    label: {
      fr: "captages d'eau souterraine autorisés",
      nl: 'vergunde grondwaterwinningen',
      en: 'authorised groundwater catchments',
      de: 'genehmigte Grundwasserentnahmen',
    },
    detail: {
      fr: "dont une centaine exploités ; la nappe du Bruxellien fournit ~80 % de l'eau captée en Région (Bruxelles Environnement)",
      nl: 'waarvan een honderdtal in gebruik ; de Brusseliaan-laag levert ~80 % van het in het Gewest gewonnen water (Leefmilieu Brussel)',
      en: 'about a hundred in use ; the Brusselian aquifer provides ~80% of water captured in the Region (Brussels Environment)',
      de: 'davon etwa hundert in Betrieb ; der Brüsselianer Grundwasserleiter liefert ~80 % des in der Region gewonnenen Wassers (Brussels Environment)',
    },
    confiance: 'estimated',
  },
  {
    id: 'surface-impermeable',
    valeur: { fr: 'environ 53 %', nl: 'ongeveer 53 %', en: 'about 53%', de: 'rund 53 %' },
    label: {
      fr: 'de la surface régionale imperméabilisée',
      nl: 'van het gewestelijk oppervlak verhard',
      en: 'of the regional surface sealed',
      de: 'der regionalen Fläche versiegelt',
    },
    detail: {
      fr: "estimation Bruxelles Environnement, état de l'environnement",
      nl: 'schatting Leefmilieu Brussel, staat van het leefmilieu',
      en: 'estimate by Brussels Environment, state of the environment',
      de: 'Schätzung Brussels Environment, Umweltzustandsbericht',
    },
    confiance: 'estimated',
  },
  {
    id: 'reseau-vivaqua',
    valeur: { fr: '3 149 km', nl: '3 149 km', en: '3,149 km', de: '3 149 km' },
    label: {
      fr: "de conduites d'eau potable (Vivaqua)",
      nl: 'drinkwaterleidingen (Vivaqua)',
      en: 'of drinking-water pipes (Vivaqua)',
      de: 'Trinkwasserleitungen (Vivaqua)',
    },
    detail: {
      fr: "chiffres clés 2025 ; réseau distinct des 1 867 km d'égouts (Hydria)",
      nl: 'kerncijfers 2025 ; los van de 1 867 km riolering (Hydria)',
      en: 'key figures 2025 ; separate from the 1,867 km of sewers (Hydria)',
      de: 'Kennzahlen 2025 ; getrennt von den 1 867 km Kanalisation (Hydria)',
    },
    confiance: 'official',
  },
  {
    id: 'risque-inondation',
    valeur: { fr: 'environ 1/5', nl: 'ongeveer 1/5', en: 'about 1/5', de: 'rund 1/5' },
    label: {
      fr: "du territoire en zone à risque d'inondation",
      nl: 'van het grondgebied in overstromingsrisicozone',
      en: 'of the territory in a flood-risk zone',
      de: 'des Gebiets in einer Hochwasserrisikozone',
    },
    detail: {
      fr: '1 Bruxellois sur 3 en zone à risque (Bruxelles Environnement, carte 2025)',
      nl: '1 op 3 Brusselaars in een risicozone (Leefmilieu Brussel, kaart 2025)',
      en: '1 in 3 Brussels residents in a risk zone (Brussels Environment, 2025 map)',
      de: '1 von 3 Brüsselern in einer Risikozone (Brussels Environment, Karte 2025)',
    },
    confiance: 'official',
  },
];
