// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

export type Locale = 'fr' | 'nl' | 'en' | 'de';

/** Les 5 niveaux de pouvoir, cles internes */
export const POWER_LEVEL_KEYS = ['UE', 'Federal', 'Communautaire', 'Regional', 'Communal'] as const;

export type PowerLevelKey = (typeof POWER_LEVEL_KEYS)[number];

/** Libelles des niveaux de pouvoir par locale */
export const POWER_LEVEL_LABELS: Record<Locale, Record<PowerLevelKey, string>> = {
  fr: {
    UE: 'UE',
    Federal: 'Fédéral',
    Communautaire: 'Communautaire',
    Regional: 'Régional',
    Communal: 'Communal',
  },
  nl: {
    UE: 'EU',
    Federal: 'Federaal',
    Communautaire: 'Gemeenschappen',
    Regional: 'Gewestelijk',
    Communal: 'Gemeentelijk',
  },
  en: {
    UE: 'EU',
    Federal: 'Federal',
    Communautaire: 'Community',
    Regional: 'Regional',
    Communal: 'Municipal',
  },
  de: {
    UE: 'EU',
    Federal: 'Föderal',
    Communautaire: 'Gemeinschaften',
    Regional: 'Regional',
    Communal: 'Kommunal',
  },
};

/** Libelles de la legende/caption par locale */
export const MATRIX_CAPTION: Record<Locale, string> = {
  fr: 'Matrice de responsabilite : 5 niveaux de pouvoir par theme climatique a Bruxelles',
  nl: 'Verantwoordelijkheidsmatrix : 5 machtsniveaus per klimaatthema in Brussel',
  en: 'Responsibility matrix: 5 levels of government per climate theme in Brussels',
  de: 'Verantwortungsmatrix: 5 Regierungsebenen je Klimathema in Brussel',
};

/** Libelle colonne Theme par locale */
export const THEME_COL_LABEL: Record<Locale, string> = {
  fr: 'Theme',
  nl: 'Thema',
  en: 'Theme',
  de: 'Thema',
};

/** Libelle aria cellule vide par locale */
export const EMPTY_CELL_LABEL: Record<Locale, string> = {
  fr: 'Non competent',
  nl: 'Niet bevoegd',
  en: 'Not competent',
  de: 'Nicht zustandig',
};

/** Un theme = une ligne de la matrice */
export type CompetenceTheme = {
  /** Identifiant court */
  id: string;
  /** Libelle par locale */
  label: Record<Locale, string>;
  /** Contenu par niveau de pouvoir et par locale ; null = non competent */
  cells: Record<PowerLevelKey, Record<Locale, string | null>>;
};

export const COMPETENCES: CompetenceTheme[] = [
  {
    id: 'canicule',
    label: {
      fr: 'Plan canicule (santé)',
      nl: 'Hitteplan',
      en: 'Heat plan',
      de: 'Hitzeplan',
    },
    cells: {
      UE: { fr: null, nl: null, en: null, de: null },
      Federal: {
        fr: 'Alerte ozone-chaleur (SPF Santé, RMG)',
        nl: 'Ozon-hittealarm (FOD Volksgezondheid, RMG)',
        en: 'Ozone-heat alert (Federal Health, RMG)',
        de: 'Ozon-Hitzealarm (FOD Volksgesundheit, RMG)',
      },
      Communautaire: {
        fr: 'Plan forte chaleur, maisons de repos (Cocom/Vivalis)',
        nl: 'Hittegolfplan, rusthuizen (Cocom/Vivalis)',
        en: 'Extreme heat plan, care homes (Cocom/Vivalis)',
        de: 'Hitzewellenplan, Pflegeheime (Cocom/Vivalis)',
      },
      Regional: {
        fr: 'Coordination adaptation (Bruxelles Environnement)',
        nl: 'Adaptatiecoordinatie (Leefmilieu Brussel)',
        en: 'Adaptation coordination (Brussels Environment)',
        de: 'Anpassungskoordinierung (Brussel Umwelt)',
      },
      Communal: {
        fr: 'Terrain : écoles, CPAS, eau',
        nl: 'Terrein : scholen, OCMW, water',
        en: 'Ground level: schools, CPAS, water',
        de: 'Vor Ort : Schulen, OCMW, Wasser',
      },
    },
  },
  {
    id: 'ecoles',
    label: {
      fr: 'Écoles',
      nl: 'Scholen',
      en: 'Schools',
      de: 'Schulen',
    },
    cells: {
      UE: { fr: null, nl: null, en: null, de: null },
      Federal: { fr: null, nl: null, en: null, de: null },
      Communautaire: {
        fr: 'Bâtiments et calendrier scolaires (FWB et VGC)',
        nl: 'Schoolgebouwen en kalender (FWB et VGC)',
        en: 'School buildings and calendar (FWB et VGC)',
        de: 'Schulgebaude und Kalender (FWB et VGC)',
      },
      Regional: { fr: null, nl: null, en: null, de: null },
      Communal: {
        fr: 'Pouvoirs organisateurs, fermetures',
        nl: 'Inrichtende machten, sluitingen',
        en: 'Organising authorities, closures',
        de: 'Schultrager, Schliessungen',
      },
    },
  },
  {
    id: 'canopee',
    label: {
      fr: 'Arbres et canopée',
      nl: 'Bomen en bladerdak',
      en: 'Trees and canopy',
      de: 'Bäume und Blätterdach',
    },
    cells: {
      UE: { fr: null, nl: null, en: null, de: null },
      Federal: { fr: null, nl: null, en: null, de: null },
      Communautaire: { fr: null, nl: null, en: null, de: null },
      Regional: {
        fr: 'Permis, Plan Nature (Bruxelles Environnement)',
        nl: 'Vergunningen, Natuurplan (Leefmilieu Brussel)',
        en: 'Permits, Nature Plan (Brussels Environment)',
        de: 'Genehmigungen, Naturplan (Brussel Umwelt)',
      },
      Communal: {
        fr: "Arbres communaux, permis d'abattage",
        nl: 'Gemeentebomen, kapvergunning',
        en: 'Municipal trees, felling permits',
        de: 'Gemeindebaume, Fallgenehmigung',
      },
    },
  },
  {
    id: 'voitures',
    label: {
      fr: 'Voitures et LEZ',
      nl: "Auto's en LEZ",
      en: 'Cars and LEZ',
      de: 'Autos und LEZ',
    },
    cells: {
      UE: {
        fr: "Normes d'émissions (Fit for 55)",
        nl: 'Emissienormen (Fit for 55)',
        en: 'Emission standards (Fit for 55)',
        de: 'Emissionsnormen (Fit for 55)',
      },
      Federal: {
        fr: 'Fiscalité automobile, immatriculation',
        nl: 'Autofiscaliteit, inschrijving',
        en: 'Vehicle taxation, registration',
        de: 'Kraftfahrzeugsteuer, Zulassung',
      },
      Communautaire: { fr: null, nl: null, en: null, de: null },
      Regional: {
        fr: 'LEZ, Good Move',
        nl: 'LEZ, Good Move',
        en: 'LEZ, Good Move',
        de: 'LEZ, Good Move',
      },
      Communal: {
        fr: 'Stationnement, voiries locales',
        nl: 'Parkeren, lokale wegen',
        en: 'Parking, local roads',
        de: 'Parken, Gemeindestrassen',
      },
    },
  },
  {
    id: 'batiments',
    label: {
      fr: 'Bâtiments et isolation',
      nl: 'Gebouwen en isolatie',
      en: 'Buildings and insulation',
      de: 'Gebäude und Dämmung',
    },
    cells: {
      UE: {
        fr: 'Directive performance énergétique',
        nl: 'Richtlijn energieprestatie',
        en: 'Energy performance directive',
        de: 'Energieleistungsrichtlinie',
      },
      Federal: {
        fr: 'Énergie, normes produits',
        nl: 'Energie, productnormen',
        en: 'Energy, product standards',
        de: 'Energie, Produktnormen',
      },
      Communautaire: { fr: null, nl: null, en: null, de: null },
      Regional: {
        fr: 'PEB, Renolution, urbanisme',
        nl: 'EPB, Renolution, stedenbouw',
        en: 'EPC, Renolution, urban planning',
        de: 'EPB, Renolution, Stadtplanung',
      },
      Communal: {
        fr: 'Permis, logement communal',
        nl: 'Vergunningen, gemeentelijke huisvesting',
        en: 'Permits, municipal housing',
        de: 'Genehmigungen, kommunaler Wohnungsbau',
      },
    },
  },
  {
    id: 'eau',
    label: {
      fr: 'Eau',
      nl: 'Water',
      en: 'Water',
      de: 'Wasser',
    },
    cells: {
      UE: {
        fr: "Directive-cadre sur l'eau",
        nl: 'Kaderrichtlijn water',
        en: 'Water Framework Directive',
        de: 'Wasserrahmenrichtlinie',
      },
      Federal: { fr: null, nl: null, en: null, de: null },
      Communautaire: { fr: null, nl: null, en: null, de: null },
      Regional: {
        fr: 'Plan Eau, Vivaqua et Hydria (Bruxelles Environnement)',
        nl: 'Waterplan, Vivaqua en Hydria (Leefmilieu Brussel)',
        en: 'Water Plan, Vivaqua and Hydria (Brussels Environment)',
        de: 'Wasserplan, Vivaqua und Hydria (Brussel Umwelt)',
      },
      Communal: {
        fr: 'Égouttage local',
        nl: 'Lokale riolering',
        en: 'Local sewerage',
        de: 'Ortliche Kanalisation',
      },
    },
  },
  {
    id: 'sans-abri',
    label: {
      fr: 'Sans-abris',
      nl: 'Daklozen',
      en: 'Homeless',
      de: 'Obdachlose',
    },
    cells: {
      UE: { fr: null, nl: null, en: null, de: null },
      Federal: {
        fr: 'Sécurité sociale ; Fedasil (asile)',
        nl: 'Sociale zekerheid ; Fedasil (asiel)',
        en: 'Social security ; Fedasil (asylum)',
        de: 'Soziale Sicherheit ; Fedasil (Asyl)',
      },
      Communautaire: {
        fr: "Aide aux personnes, Samusocial, Bruss'help (Cocom)",
        nl: "Personenhulp, Samusocial, Bruss'help (Cocom)",
        en: "Personal assistance, Samusocial, Bruss'help (Cocom)",
        de: "Personenhilfe, Samusocial, Bruss'help (Cocom)",
      },
      Regional: {
        fr: 'Financement',
        nl: 'Financiering',
        en: 'Funding',
        de: 'Finanzierung',
      },
      Communal: {
        fr: 'CPAS',
        nl: 'OCMW',
        en: 'CPAS',
        de: 'OCMW',
      },
    },
  },
  {
    id: 'travail',
    label: {
      fr: 'Travail (chaleur)',
      nl: 'Werk en hitte',
      en: 'Work and heat',
      de: 'Arbeit und Hitze',
    },
    cells: {
      UE: {
        fr: 'Directive santé-sécurité au travail',
        nl: 'Richtlijn gezondheid en veiligheid op het werk',
        en: 'Occupational health and safety directive',
        de: 'Arbeitsschutzrichtlinie',
      },
      Federal: {
        fr: 'Code du bien-être au travail (seuils)',
        nl: 'Welzijnswet werk (drempels)',
        en: 'Workplace well-being code (thresholds)',
        de: 'Wohlbefindenscode Arbeit (Schwellenwerte)',
      },
      Communautaire: { fr: null, nl: null, en: null, de: null },
      Regional: {
        fr: 'Actiris, économie',
        nl: 'Actiris, economie',
        en: 'Actiris, economy',
        de: 'Actiris, Wirtschaft',
      },
      Communal: { fr: null, nl: null, en: null, de: null },
    },
  },
];
