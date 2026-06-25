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
    label: 'Plan canicule (santé)',
    cells: {
      UE: null,
      Federal: 'Alerte ozone-chaleur (SPF Santé, RMG)',
      Communautaire: 'Plan forte chaleur, maisons de repos (Cocom/Vivalis)',
      Regional: 'Coordination adaptation (Bruxelles Environnement)',
      Communal: 'Terrain : écoles, CPAS, eau',
    },
  },
  {
    id: 'ecoles',
    label: 'Écoles',
    cells: {
      UE: null,
      Federal: null,
      Communautaire: 'Bâtiments et calendrier scolaires (FWB et VGC)',
      Regional: null,
      Communal: 'Pouvoirs organisateurs, fermetures',
    },
  },
  {
    id: 'canopee',
    label: 'Arbres et canopée',
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
      UE: 'Normes d\'émissions (Fit for 55)',
      Federal: 'Fiscalité automobile, immatriculation',
      Communautaire: null,
      Regional: 'LEZ, Good Move',
      Communal: 'Stationnement, voiries locales',
    },
  },
  {
    id: 'batiments',
    label: 'Bâtiments et isolation',
    cells: {
      UE: 'Directive performance énergétique',
      Federal: 'Énergie, normes produits',
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
      Communal: 'Égouttage local',
    },
  },
  {
    id: 'sans-abri',
    label: 'Sans-abris',
    cells: {
      UE: null,
      Federal: 'Sécurité sociale ; Fedasil (asile)',
      Communautaire: "Aide aux personnes, Samusocial, Bruss'help (Cocom)",
      Regional: 'Financement',
      Communal: 'CPAS',
    },
  },
  {
    id: 'travail',
    label: 'Travail (chaleur)',
    cells: {
      UE: 'Directive santé-sécurité au travail',
      Federal: 'Code du bien-être au travail (seuils)',
      Communautaire: null,
      Regional: 'Actiris, économie',
      Communal: null,
    },
  },
];
