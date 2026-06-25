// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

export type Locale = 'fr' | 'nl' | 'en' | 'de';

export type ChantierConfiance = 'official' | 'estimated' | 'unconfirmed';

export type ChantierType = 'polemique' | 'contre-exemple';

export type ChantierRowLocalized = {
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

/** @deprecated Use CHANTIERS_I18N[locale] instead */
export type ChantierRow = ChantierRowLocalized;

export type ChantiersI18n = {
  rows: ChantierRowLocalized[];
  noteBas: string;
};

export const CHANTIERS_I18N: Record<Locale, ChantiersI18n> = {
  fr: {
    rows: [
      {
        id: 'schuman',
        chantier: 'Rond-point Schuman',
        maitreDOuvrage: 'Beliris + Bruxelles Mobilité',
        cout: '30 M€ prévus, ~42 M€ constatés',
        arbres: 'Auvent/canopée abandonné',
        polemique:
          "Coeur du quartier européen minéralisé ; mise en demeure d'urban.brussels le 6 novembre 2025",
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
        arbres:
          "Urbanisation des terrains de plus de 0,5 ha suspendue par le tribunal jusqu'au 31 décembre 2026",
        polemique: "Suspension judiciaire de l'urbanisation",
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
        cout: "~5 M€, 43 092 m² de cours d'écoles déminéralisées (19 écoles)",
        arbres: 'Déminéralisation structurelle',
        polemique: 'Exemple structurel de politique de verdissement scolaire',
        confiance: 'estimated',
        source: 'Presse/Région',
        type: 'contre-exemple',
      },
    ],
    noteBas:
      "Selon le collectif Help4Trees et IEB, plus de 62 000 arbres à haute tige ont été autorisés à l'abattage entre 2010 et 2022 (hors forêt de Soignes) pour 3 254 replantés ; les permis ne mesurent pas les abattages réellement réalisés.",
  },

  nl: {
    rows: [
      {
        id: 'schuman',
        chantier: 'Rotonde Schuman',
        maitreDOuvrage: 'Beliris + Brussel Mobiliteit',
        cout: '30 M€ geraamd, ~42 M€ vastgesteld',
        arbres: 'Luifel/bladerdak geschrapt',
        polemique:
          'Hart van de Europese wijk verhard ; ingebrekestelling van urban.brussels op 6 november 2025',
        confiance: 'estimated',
        source: 'Pers (RTBF/BRUZZ)',
        type: 'polemique',
      },
      {
        id: 'mediapark',
        chantier: 'Mediapark / Reyers (Schaarbeek)',
        maitreDOuvrage: 'Gewestelijke operator',
        cout: 'Niet gekwantificeerd',
        arbres: '~1 000 bomen betrokken volgens Greenpeace en IEB',
        polemique: 'Sterk verhard park betwist',
        confiance: 'unconfirmed',
        source: 'Pers/verenigingen',
        type: 'polemique',
      },
      {
        id: 'toison-dor',
        chantier: "Gulden Vlieslaan",
        maitreDOuvrage: 'Brussel Mobiliteit',
        cout: '~16 M€ (niet gegarandeerd)',
        arbres: 'Betwiste verharding',
        polemique: 'Beroep van handelaars',
        confiance: 'estimated',
        source: 'Pers',
        type: 'polemique',
      },
      {
        id: 'josaphat',
        chantier: 'Braakland Josaphat (Schaarbeek)',
        maitreDOuvrage: 'SAU / promotor',
        cout: 'Verlies ~31,7 M€ voor de SAU bij stopzetting',
        arbres:
          'Bebouwing van percelen groter dan 0,5 ha geschorst door de rechtbank tot 31 december 2026',
        polemique: 'Gerechtelijke schorsing van de bebouwing',
        confiance: 'official',
        source: 'Rechterlijke uitspraak (pers)',
        type: 'polemique',
      },
      {
        id: 'flagey',
        chantier: 'Flageyplein (Elsene)',
        maitreDOuvrage: 'Gedeeltelijke ontharding',
        cout: '~1 M€ (~100 bomen)',
        arbres: '~100 bomen geplant',
        polemique: 'Voorbeeld van geslaagde vergroening',
        confiance: 'estimated',
        source: 'Pers',
        type: 'contre-exemple',
      },
      {
        id: 'recreation',
        chantier: 'Operatie Ré-création',
        maitreDOuvrage: 'Brussels Hoofdstedelijk Gewest',
        cout: '~5 M€, 43 092 m² ontharde schoolpleinen (19 scholen)',
        arbres: 'Structurele ontharding',
        polemique: 'Structureel voorbeeld van beleid voor vergroening van scholen',
        confiance: 'estimated',
        source: 'Pers/Gewest',
        type: 'contre-exemple',
      },
    ],
    noteBas:
      'Volgens het collectief Help4Trees en IEB werden meer dan 62 000 hoogstammige bomen geautoriseerd voor kap tussen 2010 en 2022 (buiten het Zoniënwoud), tegenover 3 254 herplante bomen ; de vergunningen meten de daadwerkelijk uitgevoerde kapwerkzaamheden niet.',
  },

  en: {
    rows: [
      {
        id: 'schuman',
        chantier: 'Schuman Roundabout',
        maitreDOuvrage: 'Beliris + Brussels Mobility',
        cout: '30 M€ planned, ~42 M€ recorded',
        arbres: 'Canopy abandoned',
        polemique:
          'Heart of the European Quarter paved over; formal notice issued by urban.brussels on 6 November 2025',
        confiance: 'estimated',
        source: 'Press (RTBF/BRUZZ)',
        type: 'polemique',
      },
      {
        id: 'mediapark',
        chantier: 'Mediapark / Reyers (Schaerbeek)',
        maitreDOuvrage: 'Regional operator',
        cout: 'Not quantified',
        arbres: '~1 000 trees concerned according to Greenpeace and IEB',
        polemique: 'Heavily paved park contested',
        confiance: 'unconfirmed',
        source: 'Press/associations',
        type: 'polemique',
      },
      {
        id: 'toison-dor',
        chantier: "Avenue de la Toison d'Or",
        maitreDOuvrage: 'Brussels Mobility',
        cout: '~16 M€ (not guaranteed)',
        arbres: 'Contested mineralisation',
        polemique: 'Legal challenge by traders',
        confiance: 'estimated',
        source: 'Press',
        type: 'polemique',
      },
      {
        id: 'josaphat',
        chantier: 'Josaphat Brownfield (Schaerbeek)',
        maitreDOuvrage: 'SAU / developer',
        cout: 'Loss ~31.7 M€ for SAU if halted',
        arbres:
          'Development of plots over 0.5 ha suspended by court until 31 December 2026',
        polemique: 'Judicial suspension of development',
        confiance: 'official',
        source: 'Court ruling (press)',
        type: 'polemique',
      },
      {
        id: 'flagey',
        chantier: 'Place Flagey (Ixelles)',
        maitreDOuvrage: 'Partial de-paving',
        cout: '~1 M€ (~100 trees)',
        arbres: '~100 trees planted',
        polemique: 'Counter-example of successful greening',
        confiance: 'estimated',
        source: 'Press',
        type: 'contre-exemple',
      },
      {
        id: 'recreation',
        chantier: 'Operation Ré-création',
        maitreDOuvrage: 'Brussels-Capital Region',
        cout: '~5 M€, 43 092 m² of de-paved schoolyards (19 schools)',
        arbres: 'Structural de-paving',
        polemique: 'Structural counter-example of school greening policy',
        confiance: 'estimated',
        source: 'Press/Region',
        type: 'contre-exemple',
      },
    ],
    noteBas:
      'According to the Help4Trees and IEB collective, more than 62 000 large trees were authorised for felling between 2010 and 2022 (excluding the Sonian Forest), against 3 254 replanted; permits do not measure trees actually felled.',
  },

  de: {
    rows: [
      {
        id: 'schuman',
        chantier: 'Kreisverkehr Schuman',
        maitreDOuvrage: 'Beliris + Brussel Mobilität',
        cout: '30 M€ geplant, ~42 M€ festgestellt',
        arbres: 'Vordach/Blätterdach aufgegeben',
        polemique:
          'Herz des Europaviertels versiegelt; Abmahnung von urban.brussels am 6. November 2025',
        confiance: 'estimated',
        source: 'Presse (RTBF/BRUZZ)',
        type: 'polemique',
      },
      {
        id: 'mediapark',
        chantier: 'Mediapark / Reyers (Schaerbeek)',
        maitreDOuvrage: 'Regionaler Betreiber',
        cout: 'Nicht beziffert',
        arbres: '~1 000 betroffene Bäume laut Greenpeace und IEB',
        polemique: 'Stark versiegelter Park umstritten',
        confiance: 'unconfirmed',
        source: 'Presse/Verbände',
        type: 'polemique',
      },
      {
        id: 'toison-dor',
        chantier: "Avenue de la Toison d'Or",
        maitreDOuvrage: 'Brussel Mobilität',
        cout: '~16 M€ (nicht garantiert)',
        arbres: 'Umstrittene Versiegelung',
        polemique: 'Klage von Gewerbetreibenden',
        confiance: 'estimated',
        source: 'Presse',
        type: 'polemique',
      },
      {
        id: 'josaphat',
        chantier: 'Brachland Josaphat (Schaerbeek)',
        maitreDOuvrage: 'SAU / Projektträger',
        cout: 'Verlust ~31,7 M€ für die SAU bei Abbruch',
        arbres:
          'Bebauung von Grundstücken über 0,5 ha vom Gericht bis 31. Dezember 2026 ausgesetzt',
        polemique: 'Gerichtliche Aussetzung der Bebauung',
        confiance: 'official',
        source: 'Gerichtsentscheidung (Presse)',
        type: 'polemique',
      },
      {
        id: 'flagey',
        chantier: 'Place Flagey (Ixelles)',
        maitreDOuvrage: 'Teilweise Entsiegelung',
        cout: '~1 M€ (~100 Bäume)',
        arbres: '~100 gepflanzte Bäume',
        polemique: 'Gegenbeispiel einer gelungenen Begrünung',
        confiance: 'estimated',
        source: 'Presse',
        type: 'contre-exemple',
      },
      {
        id: 'recreation',
        chantier: 'Operation Ré-création',
        maitreDOuvrage: 'Region Brüssel-Hauptstadt',
        cout: '~5 M€, 43 092 m² entsiegelte Schulhöfe (19 Schulen)',
        arbres: 'Strukturelle Entsiegelung',
        polemique: 'Strukturelles Gegenbeispiel für Schulbegrünungspolitik',
        confiance: 'estimated',
        source: 'Presse/Region',
        type: 'contre-exemple',
      },
    ],
    noteBas:
      'Laut dem Kollektiv Help4Trees und IEB wurden zwischen 2010 und 2022 mehr als 62 000 hochstämmige Bäume zum Fällen genehmigt (ohne den Sonienwald), gegenüber 3 254 Neupflanzungen ; die Genehmigungen messen nicht die tatsächlich durchgeführten Fällungen.',
  },
};

/** Convenience accessor — returns the localized rows for the given locale */
export function getChantiersForLocale(locale: Locale): ChantiersI18n {
  return CHANTIERS_I18N[locale] ?? CHANTIERS_I18N.fr;
}

// ---------------------------------------------------------------------------
// Backward-compat exports used by existing code before i18n
// ---------------------------------------------------------------------------

/** @deprecated Import CHANTIERS_I18N instead */
export const CHANTIERS: ChantierRowLocalized[] = CHANTIERS_I18N.fr.rows;

/** @deprecated Import CHANTIERS_I18N instead */
export const NOTE_BAS_TABLEAU: string = CHANTIERS_I18N.fr.noteBas;
