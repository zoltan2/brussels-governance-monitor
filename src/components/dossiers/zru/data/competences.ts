// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Locale } from './types';

/**
 * Qui tient quoi sur le territoire de la ZRU : matrice thème × niveau de pouvoir.
 *
 * Tiré de l'enquête `01-geographie-pauvrete.md` §5 et du référentiel institutionnel,
 * chaque case relue dans sa source le 24/09/2026 (rapport de la tâche 15) :
 * - Région et COCOM : page « Les compétences » du Parlement bruxellois ;
 * - rapport sur l'état de la pauvreté : ordonnance de l'Assemblée réunie du 20 juillet 2006
 *   et ses développements (Observatoire de la Santé et du Social, service du Collège réuni) ;
 * - ZRU : ordonnance organique du 6 octobre 2016, art. 5, § 2 ;
 * - Beliris : beliris.be ; cofinancement communal : quartiers.brussels ;
 * - intégration sociale : SPP Intégration sociale (loi du 26 mai 2002).
 *
 * Case absente = aucun rôle établi par ces sources (rendue avec le libellé de case vide),
 * jamais une supposition. Les CPAS sont des organismes publics locaux distincts des
 * communes : aucune relation de tutelle n'est affirmée ici.
 */

export type CleNiveau = 'federal' | 'regional' | 'cocom' | 'communal';

export const NIVEAUX: { cle: CleNiveau; libelle: Record<Locale, string> }[] = [
  { cle: 'federal', libelle: { fr: 'Fédéral', nl: 'Federaal', en: 'Federal', de: 'Föderal' } },
  { cle: 'regional', libelle: { fr: 'Régional', nl: 'Gewestelijk', en: 'Regional', de: 'Regional' } },
  {
    cle: 'cocom',
    libelle: {
      fr: 'Commission communautaire commune (COCOM)',
      nl: 'Gemeenschappelijke Gemeenschapscommissie (GGC)',
      en: 'Common Community Commission (COCOM)',
      de: 'Gemeinsame Gemeinschaftskommission (GGK)',
    },
  },
  { cle: 'communal', libelle: { fr: 'Communal', nl: 'Gemeentelijk', en: 'Municipal', de: 'Kommunal' } },
];

export const LIGNES: {
  id: string;
  libelle: Record<Locale, string>;
  cases: Partial<Record<CleNiveau, Record<Locale, string>>>;
}[] = [
  {
    id: 'mesurer',
    libelle: {
      fr: 'Mesurer la pauvreté',
      nl: 'Armoede meten',
      en: 'Measuring poverty',
      de: 'Armut messen',
    },
    cases: {
      regional: {
        fr: 'Indicateurs par quartier : Monitoring des quartiers de l’IBSA (perspective.brussels), 145 quartiers',
        nl: 'Indicatoren per wijk: Wijkmonitoring van het BISA (perspective.brussels), 145 wijken',
        en: 'Indicators by neighbourhood: IBSA Neighbourhood Monitoring (perspective.brussels), 145 neighbourhoods',
        de: 'Indikatoren je Quartier: Quartiersmonitoring des IBSA (perspective.brussels), 145 Quartiere',
      },
      cocom: {
        fr: 'Rapport sur l’état de la pauvreté, dont le baromètre social (ordonnance du 20 juillet 2006), élaboré par l’Observatoire de la Santé et du Social',
        nl: 'Armoederapport, met de sociale barometer (ordonnantie van 20 juli 2006), opgesteld door het Observatorium voor Gezondheid en Welzijn',
        en: 'Report on the state of poverty, including the social barometer (ordinance of 20 July 2006), prepared by the Health and Social Observatory',
        de: 'Bericht über den Stand der Armut, einschließlich des Sozialbarometers (Ordonnanz vom 20. Juli 2006), erstellt von der Beobachtungsstelle für Gesundheit und Soziales',
      },
    },
  },
  {
    id: 'definir-zru',
    libelle: {
      fr: 'Définir la ZRU',
      nl: 'De ZSH afbakenen',
      en: 'Defining the urban revitalisation zone',
      de: 'Die städtische Revitalisierungszone abgrenzen',
    },
    cases: {
      regional: {
        fr: 'Le Gouvernement régional fixe le périmètre selon trois conditions cumulatives par secteur statistique : revenu, densité, chômage (ordonnance du 6 octobre 2016)',
        nl: 'De gewestregering legt de perimeter vast volgens drie cumulatieve voorwaarden per statistische sector: inkomen, dichtheid, werkloosheid (ordonnantie van 6 oktober 2016)',
        en: 'The regional Government sets the boundary using three cumulative conditions per statistical sector: income, density, unemployment (ordinance of 6 October 2016)',
        de: 'Die Regionalregierung legt die Abgrenzung nach drei kumulativen Bedingungen je statistischem Sektor fest: Einkommen, Dichte, Arbeitslosigkeit (Ordonnanz vom 6. Oktober 2016)',
      },
    },
  },
  {
    id: 'financer-renovation',
    libelle: {
      fr: 'Financer la rénovation',
      nl: 'Renovatie financieren',
      en: 'Funding renovation',
      de: 'Erneuerung finanzieren',
    },
    cases: {
      federal: {
        fr: 'Beliris : budget fixé chaque année par l’État fédéral',
        nl: 'Beliris: budget jaarlijks vastgelegd door de federale Staat',
        en: 'Beliris: budget set each year by the federal State',
        de: 'Beliris: Budget jährlich vom föderalen Staat festgelegt',
      },
      regional: {
        fr: 'Rénovation urbaine : contrats de quartier durables, contrats de rénovation urbaine, contrats école, Politique de la Ville',
        nl: 'Stadsvernieuwing: duurzame wijkcontracten, stadsvernieuwingscontracten, schoolcontracten, Stadsbeleid',
        en: 'Urban renewal: sustainable neighbourhood contracts, urban renovation contracts, school contracts, City Policy',
        de: 'Stadterneuerung: nachhaltige Quartiersverträge, Stadterneuerungsverträge, Schulverträge, Stadtpolitik',
      },
      communal: {
        fr: 'Contribution d’au moins 5 % du montant de chaque contrat de quartier durable',
        nl: 'Bijdrage van minstens 5 % van het bedrag van elk duurzaam wijkcontract',
        en: 'Contribution of at least 5% of the amount of each sustainable neighbourhood contract',
        de: 'Beitrag von mindestens 5 % des Betrags jedes nachhaltigen Quartiersvertrags',
      },
    },
  },
  {
    id: 'aide-sociale',
    libelle: {
      fr: 'Distribuer l’aide sociale',
      nl: 'Maatschappelijke hulp verlenen',
      en: 'Providing social assistance',
      de: 'Sozialhilfe gewähren',
    },
    cases: {
      federal: {
        fr: 'Droit à l’intégration sociale (loi du 26 mai 2002) : SPP Intégration sociale',
        nl: 'Recht op maatschappelijke integratie (wet van 26 mei 2002): POD Maatschappelijke Integratie',
        en: 'Right to social integration (law of 26 May 2002): PPS Social Integration',
        de: 'Recht auf soziale Eingliederung (Gesetz vom 26. Mai 2002): ÖPD Sozialeingliederung',
      },
      cocom: {
        fr: 'Aide aux personnes, dont la politique d’aide sociale (matière bicommunautaire)',
        nl: 'Bijstand aan personen, waaronder het beleid inzake maatschappelijk welzijn (bicommunautaire aangelegenheid)',
        en: 'Assistance to persons, including social assistance policy (bi-community matter)',
        de: 'Personenbeistand, einschließlich der Sozialhilfepolitik (bikommunitäre Angelegenheit)',
      },
      communal: {
        fr: 'CPAS, un par commune : octroi du revenu d’intégration et de l’aide sociale',
        nl: 'OCMW, één per gemeente: toekenning van het leefloon en van maatschappelijke dienstverlening',
        en: 'CPAS (public social welfare centres), one per municipality: granting the integration income and social assistance',
        de: 'ÖSHZ, eines je Gemeinde: Gewährung des Eingliederungseinkommens und der Sozialhilfe',
      },
    },
  },
];

export const CAPTION: Record<Locale, string> = {
  fr: 'Qui tient quoi : mesure, périmètre, financement et aide sociale',
  nl: 'Wie doet wat: meting, perimeter, financiering en maatschappelijke hulp',
  en: 'Who holds what: measurement, boundary, funding and social assistance',
  de: 'Wer ist wofür zuständig: Messung, Abgrenzung, Finanzierung und Sozialhilfe',
};

export const COL_THEME: Record<Locale, string> = {
  fr: 'Thème',
  nl: 'Thema',
  en: 'Topic',
  de: 'Thema',
};

export const CASE_VIDE: Record<Locale, string> = {
  fr: 'Aucun rôle établi par les sources',
  nl: 'Geen rol vastgesteld in de bronnen',
  en: 'No role established by the sources',
  de: 'Keine Rolle in den Quellen belegt',
};
