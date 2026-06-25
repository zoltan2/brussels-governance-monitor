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
    maitreDOuvrage: 'Beliris + Bruxelles Mobilite',
    cout: '30 M€ prevus, ~42 M€ constates',
    arbres: 'Auvent/canopee abandonne',
    polemique:
      'Coeur du quartier europeen mineralise ; mise en demeure d\'urban.brussels le 6 novembre 2025',
    confiance: 'estimated',
    source: 'Presse (RTBF/BRUZZ)',
    type: 'polemique',
  },
  {
    id: 'mediapark',
    chantier: 'Mediapark / Reyers (Schaerbeek)',
    maitreDOuvrage: 'Operateur regional',
    cout: 'Non chiffre',
    arbres: '~1 000 arbres concernes selon Greenpeace et IEB',
    polemique: 'Parc fortement mineralise conteste',
    confiance: 'unconfirmed',
    source: 'Presse/associations',
    type: 'polemique',
  },
  {
    id: 'toison-dor',
    chantier: "Avenue de la Toison d'Or",
    maitreDOuvrage: 'Bruxelles Mobilite',
    cout: '~16 M€ (non garantis)',
    arbres: 'Mineralisation contestee',
    polemique: 'Recours de commercants',
    confiance: 'estimated',
    source: 'Presse',
    type: 'polemique',
  },
  {
    id: 'josaphat',
    chantier: 'Friche Josaphat (Schaerbeek)',
    maitreDOuvrage: 'SAU / promoteur',
    cout: 'Perte ~31,7 M€ pour la SAU si arret',
    arbres: 'Urbanisation des terrains de plus de 0,5 ha suspendue par le tribunal jusqu\'au 31 decembre 2026',
    polemique: 'Suspension judiciaire de l\'urbanisation',
    confiance: 'official',
    source: 'Decision de justice (presse)',
    type: 'polemique',
  },
  {
    id: 'flagey',
    chantier: 'Place Flagey (Ixelles)',
    maitreDOuvrage: 'Demi-mineralisation',
    cout: '~1 M€ (~100 arbres)',
    arbres: '~100 arbres plantes',
    polemique: 'Exemple de reverdissement reussi',
    confiance: 'estimated',
    source: 'Presse',
    type: 'contre-exemple',
  },
  {
    id: 'recreation',
    chantier: 'Operation Re-creation',
    maitreDOuvrage: 'Region de Bruxelles-Capitale',
    cout: '~5 M€, 43 092 m² de cours d\'ecoles demineralisees (19 ecoles)',
    arbres: 'Demineralisation structurelle',
    polemique: 'Exemple structurel de politique de verdissement scolaire',
    confiance: 'estimated',
    source: 'Presse/Region',
    type: 'contre-exemple',
  },
];

export const NOTE_BAS_TABLEAU =
  "Selon le collectif Help4Trees et IEB, plus de 62 000 arbres a haute tige ont ete autorises a l'abattage entre 2010 et 2022 (hors foret de Soignes) pour 3 254 replantes ; les permis ne mesurent pas les abattages reellement realises.";
