// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/** Les 5 niveaux de pouvoir, dans l'ordre d'affichage */
export const POWER_LEVELS = ['UE', 'Federal', 'Communautaire', 'Regional', 'Communal'] as const;

export type PowerLevel = (typeof POWER_LEVELS)[number];

/** Un theme = une ligne de la matrice */
export type CompetenceTheme = {
  /** Identifiant court */
  id: string;
  /** Libelle affiche en en-tete de ligne */
  label: string;
  /** Contenu par niveau de pouvoir ; null = non competent */
  cells: Record<PowerLevel, string | null>;
};

export const COMPETENCES: CompetenceTheme[] = [
  {
    id: 'canicule',
    label: 'Plan canicule (sante)',
    cells: {
      UE: null,
      Federal: 'Alerte ozone-chaleur (SPF Sante, RMG)',
      Communautaire: 'Plan forte chaleur, maisons de repos (Cocom/Vivalis)',
      Regional: 'Coordination adaptation (Bruxelles Environnement)',
      Communal: 'Terrain : ecoles, CPAS, eau',
    },
  },
  {
    id: 'ecoles',
    label: 'Ecoles',
    cells: {
      UE: null,
      Federal: null,
      Communautaire: 'Batiments et calendrier scolaires (FWB et VGC)',
      Regional: null,
      Communal: 'Pouvoirs organisateurs, fermetures',
    },
  },
  {
    id: 'canopee',
    label: 'Arbres et canopee',
    cells: {
      UE: null,
      Federal: null,
      Communautaire: null,
      Regional: 'Permis, Plan Nature (Bruxelles Environnement)',
      Communal: "Arbres communaux, permis d'abattage",
    },
  },
  {
    id: 'voitures',
    label: 'Voitures et LEZ',
    cells: {
      UE: 'Normes d\'emissions (Fit for 55)',
      Federal: 'Fiscalite automobile, immatriculation',
      Communautaire: null,
      Regional: 'LEZ, Good Move',
      Communal: 'Stationnement, voiries locales',
    },
  },
  {
    id: 'batiments',
    label: 'Batiments et isolation',
    cells: {
      UE: 'Directive performance energetique',
      Federal: 'Energie, normes produits',
      Communautaire: null,
      Regional: 'PEB, Renolution, urbanisme',
      Communal: 'Permis, logement communal',
    },
  },
  {
    id: 'eau',
    label: 'Eau',
    cells: {
      UE: 'Directive-cadre sur l\'eau',
      Federal: null,
      Communautaire: null,
      Regional: 'Plan Eau, Vivaqua et Hydria (Bruxelles Environnement)',
      Communal: 'Egouttage local',
    },
  },
  {
    id: 'sans-abri',
    label: 'Sans-abris',
    cells: {
      UE: null,
      Federal: 'Securite sociale ; Fedasil (asile)',
      Communautaire: "Aide aux personnes, Samusocial, Bruss'help (Cocom)",
      Regional: 'Financement',
      Communal: 'CPAS',
    },
  },
  {
    id: 'travail',
    label: 'Travail (chaleur)',
    cells: {
      UE: 'Directive sante-securite au travail',
      Federal: 'Code du bien-etre au travail (seuils)',
      Communautaire: null,
      Regional: 'Actiris, economie',
      Communal: null,
    },
  },
];
