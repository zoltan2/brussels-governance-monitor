// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

export type ChantierConfiance = 'official' | 'estimated' | 'unconfirmed';

export type ChantierType = 'polemique' | 'contre-exemple';

export type ChantierRow = {
  /** Identifiant court pour les tests et le rendu mobile */
  id: string;
  /** Libelle du chantier */
  chantier: string;
  /** Maitre d'ouvrage */
  maitreDOuvrage: string;
  /** Cout qualifie (jamais un chiffre nu) */
  cout: string;
  /** Arbres / verdure, qualifie */
  arbres: string;
  /** Polemique ou contexte */
  polemique: string;
  /** Niveau de confiance */
  confiance: ChantierConfiance;
  /** Source de la donnee */
  source: string;
  /** Distingue chantier polemique de contre-exemple positif */
  type: ChantierType;
};

export const CHANTIERS: ChantierRow[] = [
  {
    id: 'schuman',
    chantier: 'Rond-point Schuman',
    maitreDOuvrage: 'Beliris + Bruxelles Mobilité',
    cout: '30 M€ prévus, ~42 M€ constatés',
    arbres: 'Auvent/canopée abandonné',
    polemique:
      'Coeur du quartier européen minéralisé ; mise en demeure d\'urban.brussels le 6 novembre 2025',
    confiance: 'estimated',
    source: 'Presse (RTBF/BRUZZ)',
    type: 'polemique',
  },
  {
    id: 'mediapark',
    chantier: 'Mediapark / Reyers (Schaerbeek)',
    maitreDOuvrage: 'Opérateur régional',
    cout: 'Non chiffré',
    arbres: '~1 000 arbres concernés selon Greenpeace et IEB',
    polemique: 'Parc fortement minéralisé contesté',
    confiance: 'unconfirmed',
    source: 'Presse/associations',
    type: 'polemique',
  },
  {
    id: 'toison-dor',
    chantier: "Avenue de la Toison d'Or",
    maitreDOuvrage: 'Bruxelles Mobilité',
    cout: '~16 M€ (non garantis)',
    arbres: 'Minéralisation contestée',
    polemique: 'Recours de commerçants',
    confiance: 'estimated',
    source: 'Presse',
    type: 'polemique',
  },
  {
    id: 'josaphat',
    chantier: 'Friche Josaphat (Schaerbeek)',
    maitreDOuvrage: 'SAU / promoteur',
    cout: 'Perte ~31,7 M€ pour la SAU si arrêt',
    arbres: 'Urbanisation des terrains de plus de 0,5 ha suspendue par le tribunal jusqu\'au 31 décembre 2026',
    polemique: 'Suspension judiciaire de l\'urbanisation',
    confiance: 'official',
    source: 'Décision de justice (presse)',
    type: 'polemique',
  },
  {
    id: 'flagey',
    chantier: 'Place Flagey (Ixelles)',
    maitreDOuvrage: 'Demi-minéralisation',
    cout: '~1 M€ (~100 arbres)',
    arbres: '~100 arbres plantés',
    polemique: 'Exemple de reverdissement réussi',
    confiance: 'estimated',
    source: 'Presse',
    type: 'contre-exemple',
  },
  {
    id: 'recreation',
    chantier: 'Opération Ré-création',
    maitreDOuvrage: 'Région de Bruxelles-Capitale',
    cout: '~5 M€, 43 092 m² de cours d\'écoles déminéralisées (19 écoles)',
    arbres: 'Déminéralisation structurelle',
    polemique: 'Exemple structurel de politique de verdissement scolaire',
    confiance: 'estimated',
    source: 'Presse/Région',
    type: 'contre-exemple',
  },
];

export const NOTE_BAS_TABLEAU =
  "Selon le collectif Help4Trees et IEB, plus de 62 000 arbres à haute tige ont été autorisés à l'abattage entre 2010 et 2022 (hors forêt de Soignes) pour 3 254 replantés ; les permis ne mesurent pas les abattages réellement réalisés.";
