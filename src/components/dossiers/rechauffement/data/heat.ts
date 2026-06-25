// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

export type Locale = 'fr' | 'nl' | 'en' | 'de';

export type HeatConfiance = 'official' | 'estimated' | 'unconfirmed';

export type HeatCounter = {
  /** Identifiant court pour les tests */
  id: string;
  /** Valeur toujours qualifiee, jamais un chiffre nu */
  valeur: Record<Locale, string>;
  /** Labels courts affiches sous la valeur, par locale */
  label: Record<Locale, string>;
  /** Detail et source, par locale */
  detail: Record<Locale, string>;
  /** Niveau de confiance */
  confiance: HeatConfiance;
};

export type QuartierChaud = {
  /** Identifiant court */
  id: string;
  /** Nom de la commune par locale */
  commune: Record<Locale, string>;
  /** Densite en habitants par km2 (chiffre qualifie, invariant) */
  densite: string;
  /** Note complementaire sur la commune, par locale */
  note?: Record<Locale, string>;
};

export type HeatMapData = {
  /** Titre de l'encadre, par locale */
  titre: Record<Locale, string>;
  /** Identifiant ARIA pour aria-labelledby */
  captionId: string;
  /** Liste des quartiers les plus chauds */
  quartiers: QuartierChaud[];
  /** Legende et source, par locale */
  legende: Record<Locale, string>;
  /** Niveau de confiance global */
  confiance: HeatConfiance;
};

/** Libelles des niveaux de confiance, par locale */
export const CONFIANCE_LABELS: Record<Locale, Record<HeatConfiance, string>> = {
  fr: {
    official: 'officiel',
    estimated: 'estime',
    unconfirmed: 'non confirme',
  },
  nl: {
    official: 'officieel',
    estimated: 'geschat',
    unconfirmed: 'niet bevestigd',
  },
  en: {
    official: 'official',
    estimated: 'estimated',
    unconfirmed: 'unconfirmed',
  },
  de: {
    official: 'offiziell',
    estimated: 'geschätzt',
    unconfirmed: 'unbestätigt',
  },
};

export const HEAT_COUNTERS: HeatCounter[] = [
  {
    id: 'ecart-temperature',
    valeur: { fr: "jusqu'à +10 °C", nl: 'tot +10 °C', en: 'up to +10 °C', de: 'bis zu +10 °C' },
    label: {
      fr: 'îlot de chaleur, la nuit en conditions extrêmes',
      nl: "stedelijk hitte-eiland, 's nachts in extreme omstandigheden",
      en: 'urban heat island, at night in extreme conditions',
      de: 'städtische Hitzeinsel, nachts unter extremen Bedingungen',
    },
    detail: {
      fr: '+3 °C le jour et +4,5 °C à 23h en moyenne (étude VITO 2018)',
      nl: '+3 °C overdag en +4,5 °C om 23u gemiddeld (studie VITO 2018)',
      en: '+3 °C during the day and +4.5 °C at 23:00 on average (VITO 2018 study)',
      de: '+3 °C tagsüber und +4,5 °C um 23 Uhr im Durchschnitt (Studie VITO 2018)',
    },
    confiance: 'official',
  },
  {
    id: 'jours-canicule',
    valeur: { fr: '~20 jours', nl: '~20 dagen', en: '~20 days', de: '~20 Tage' },
    label: {
      fr: 'par an au-delà de 30 °C en 2070-2100',
      nl: 'per jaar boven 30 °C in 2070-2100',
      en: 'per year above 30 °C in 2070-2100',
      de: 'pro Jahr über 30 °C in 2070-2100',
    },
    detail: {
      fr: "scénario RCP8.5, contre ~4,5/an aujourd'hui (IRM / CORDEX.be)",
      nl: "scenario RCP8.5, tegenover ~4,5/jaar vandaag (IRM / CORDEX.be)",
      en: 'scenario RCP8.5, versus ~4.5/year today (IRM / CORDEX.be)',
      de: 'Szenario RCP8.5, gegenüber ~4,5/Jahr heute (IRM / CORDEX.be)',
    },
    confiance: 'official',
  },
  {
    id: 'arbres-abattage',
    valeur: { fr: 'plus de 62 000', nl: 'meer dan 62 000', en: 'more than 62,000', de: 'über 62 000' },
    label: {
      fr: "arbres à haute tige autorisés à l'abattage",
      nl: 'hoogstammige bomen met toegestane velvergunningen',
      en: 'full-grown trees with felling permits granted',
      de: 'Hochstammbäume mit genehmigten Fällgenehmigungen',
    },
    detail: {
      fr: 'permis 2010-2022 hors forêt de Soignes, pour 3 254 replantés ; selon Help4Trees et IEB ; les permis ne mesurent pas les abattages réels',
      nl: 'vergunningen 2010-2022 exclusief Zoniënwoud, voor 3 254 herplante bomen ; volgens Help4Trees en IEB ; vergunningen meten geen werkelijke kapbeurten',
      en: 'permits 2010-2022 excluding Sonian Forest, for 3,254 replanted ; per Help4Trees and IEB ; permits do not measure actual felling',
      de: 'Genehmigungen 2010-2022 ohne Zonienwoud, für 3 254 Neupflanzungen ; laut Help4Trees und IEB ; Genehmigungen messen keine tatsächlichen Fällungen',
    },
    confiance: 'unconfirmed',
  },
  {
    id: 'piscine-exterieure',
    valeur: { fr: '0', nl: '0', en: '0', de: '0' },
    label: {
      fr: 'piscine extérieure en service à Bruxelles',
      nl: 'openluchtzwembad in gebruik in Brussel',
      en: 'outdoor swimming pool in service in Brussels',
      de: 'Freibad in Betrieb in Brüssel',
    },
    detail: {
      fr: 'depuis la fermeture de Flow en mai 2025',
      nl: 'sinds de sluiting van Flow in mei 2025',
      en: 'since the closure of Flow in May 2025',
      de: 'seit der Schließung von Flow im Mai 2025',
    },
    confiance: 'official',
  },
  {
    id: 'surmortalite-2022',
    valeur: { fr: '+2 291', nl: '+2 291', en: '+2 291', de: '+2 291' },
    label: {
      fr: "décès lors de l'été 2022 (surmortalité)",
      nl: "overlijdens tijdens de zomer van 2022 (oversterfte)",
      en: 'deaths during summer 2022 (excess mortality)',
      de: 'Todesfälle im Sommer 2022 (Übersterblichkeit)',
    },
    detail: {
      fr: "pire été en vingt ans en Belgique (Sciensano) ; Bruxelles région la plus touchée à l'été 2025",
      nl: "slechtste zomer in twintig jaar in België (Sciensano) ; Brussel meest getroffen gewest in de zomer van 2025",
      en: 'worst summer in twenty years in Belgium (Sciensano) ; Brussels most affected region in summer 2025',
      de: 'schlimmster Sommer seit zwanzig Jahren in Belgien (Sciensano) ; Brüssel am stärksten betroffene Region im Sommer 2025',
    },
    confiance: 'official',
  },
];

export const HEAT_MAP: HeatMapData = {
  titre: {
    fr: 'Quartiers les plus exposés à la chaleur (justice climatique)',
    nl: 'Wijken met de hoogste hitte-blootstelling (klimaatrechtvaardigheid)',
    en: 'Neighbourhoods most exposed to heat (climate justice)',
    de: 'Wärmste Stadtteile (Klimagerechtigkeit)',
  },
  captionId: 'rechauffement-heat-map-caption',
  quartiers: [
    {
      id: 'saint-josse',
      commune: {
        fr: 'Saint-Josse-ten-Noode',
        nl: 'Sint-Joost-ten-Node',
        en: 'Saint-Josse-ten-Noode',
        de: 'Saint-Josse-ten-Noode',
      },
      densite: '23 266 hab/km²',
      note: {
        fr: 'commune la plus pauvre de Belgique, 11 082 €/hab.',
        nl: 'armste gemeente van België, 11 082 €/inw.',
        en: 'poorest municipality in Belgium, 11,082 €/inhabitant',
        de: 'ärmste Gemeinde Belgiens, 11 082 €/Einw.',
      },
    },
    {
      id: 'koekelberg',
      commune: {
        fr: 'Koekelberg',
        nl: 'Koekelberg',
        en: 'Koekelberg',
        de: 'Koekelberg',
      },
      densite: '19 103 hab/km²',
    },
    {
      id: 'schaerbeek',
      commune: {
        fr: 'Schaerbeek',
        nl: 'Schaarbeek',
        en: 'Schaerbeek',
        de: 'Schaerbeek',
      },
      densite: '16 362 hab/km²',
    },
    {
      id: 'molenbeek',
      commune: {
        fr: 'Molenbeek-Saint-Jean',
        nl: 'Sint-Jans-Molenbeek',
        en: 'Molenbeek-Saint-Jean',
        de: 'Molenbeek-Saint-Jean',
      },
      densite: '16 359 hab/km²',
    },
  ],
  legende: {
    fr: "densité Statbel (01/2026), revenus Statbel (2023) ; les quartiers les plus minéralisés et les plus pauvres concentrent l'îlot de chaleur",
    nl: 'dichtheid Statbel (01/2026), inkomens Statbel (2023) ; de meest geminiraliseerde en armste wijken concentreren het hitte-eiland',
    en: 'density Statbel (01/2026), income Statbel (2023) ; the most mineralised and poorest neighbourhoods concentrate the heat island',
    de: 'Dichte Statbel (01/2026), Einkommen Statbel (2023) ; die am stärksten mineralisierten und ärmsten Viertel konzentrieren die Hitzeinsel',
  },
  confiance: 'official',
};
