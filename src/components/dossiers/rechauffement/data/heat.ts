// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

export type HeatConfiance = 'official' | 'estimated' | 'unconfirmed';

export type HeatCounter = {
  /** Identifiant court pour les tests */
  id: string;
  /** Valeur toujours qualifiee, jamais un chiffre nu */
  valeur: string;
  /** Label court affiché sous la valeur */
  label: string;
  /** Detail et source, affiché en texte secondaire */
  detail: string;
  /** Niveau de confiance */
  confiance: HeatConfiance;
};

export type QuartierChaud = {
  /** Identifiant court */
  id: string;
  /** Nom de la commune */
  commune: string;
  /** Densite en habitants par km² (chiffre qualifie) */
  densite: string;
  /** Note complementaire sur la commune */
  note?: string;
};

export type HeatMapData = {
  /** Titre de l'encadre */
  titre: string;
  /** Identifiant ARIA pour aria-labelledby */
  captionId: string;
  /** Liste des quartiers les plus chauds */
  quartiers: QuartierChaud[];
  /** Legende et source */
  legende: string;
  /** Niveau de confiance global */
  confiance: HeatConfiance;
};

export const HEAT_COUNTERS: HeatCounter[] = [
  {
    id: 'ecart-temperature',
    valeur: 'jusqu\'à +10 °C',
    label: 'îlot de chaleur, la nuit en conditions extrêmes',
    detail: '+3 °C le jour et +4,5 °C à 23h en moyenne (étude VITO 2018)',
    confiance: 'official',
  },
  {
    id: 'jours-canicule',
    valeur: '~20 jours',
    label: 'par an au-delà de 30 °C en 2070-2100',
    detail: 'scénario RCP8.5, contre ~4,5/an aujourd\'hui (IRM / CORDEX.be)',
    confiance: 'official',
  },
  {
    id: 'arbres-abattage',
    valeur: 'plus de 62 000',
    label: 'arbres à haute tige autorisés à l\'abattage',
    detail: 'permis 2010-2022 hors forêt de Soignes, pour 3 254 replantés ; selon Help4Trees et IEB ; les permis ne mesurent pas les abattages réels',
    confiance: 'unconfirmed',
  },
  {
    id: 'piscine-exterieure',
    valeur: '0',
    label: 'piscine extérieure à Bruxelles',
    detail: 'depuis la fermeture de Flow en mai 2025',
    confiance: 'official',
  },
  {
    id: 'surmortalite-2022',
    valeur: '+2 291',
    label: 'décès lors de l\'été 2022 (surmortalité)',
    detail: 'pire été en vingt ans en Belgique (Sciensano) ; Bruxelles région la plus touchée à l\'été 2025',
    confiance: 'official',
  },
];

export const HEAT_MAP: HeatMapData = {
  titre: 'Quartiers les plus exposés à la chaleur (justice climatique)',
  captionId: 'rechauffement-heat-map-caption',
  quartiers: [
    {
      id: 'saint-josse',
      commune: 'Saint-Josse-ten-Noode',
      densite: '23 266 hab/km²',
      note: 'commune la plus pauvre de Belgique, 11 082 €/hab.',
    },
    {
      id: 'koekelberg',
      commune: 'Koekelberg',
      densite: '19 103 hab/km²',
    },
    {
      id: 'schaerbeek',
      commune: 'Schaerbeek',
      densite: '16 362 hab/km²',
    },
    {
      id: 'molenbeek',
      commune: 'Molenbeek-Saint-Jean',
      densite: '16 359 hab/km²',
    },
  ],
  legende:
    'densité Statbel (01/2026), revenus Statbel (2023) ; les quartiers les plus minéralisés et les plus pauvres concentrent l\'îlot de chaleur',
  confiance: 'official',
};
