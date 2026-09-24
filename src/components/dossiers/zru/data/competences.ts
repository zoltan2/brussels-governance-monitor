// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Locale } from './types';

/**
 * Qui tient quoi sur le territoire de la ZRU : matrice thème × niveau de pouvoir.
 *
 * Tiré de l'enquête `01-geographie-pauvrete.md` §5 et du référentiel institutionnel.
 * Chaque case remplie porte au moins une source (`sources`), relue le 24/09/2026 et
 * affichée sous la matrice (rapport de la tâche 15, tableau des faits).
 *
 * Case absente = aucun rôle établi par ces sources (rendue avec le libellé de case vide),
 * jamais une supposition. Les CPAS sont des établissements publics distincts des
 * communes : aucune relation de tutelle n'est affirmée ici.
 */

export type CleNiveau = 'federal' | 'regional' | 'cocom' | 'communal';

/** Sources de la matrice. Les hôtes http admis sont ceux de `HOTES_HTTP_AUTORISES` (data/programmes). */
export const SOURCES_MATRICE = {
  monitoring: {
    libelle: {
      fr: 'Monitoring des quartiers, à propos',
      nl: 'Wijkmonitoring, over',
      en: 'Neighbourhood Monitoring, about',
      de: 'Quartiersmonitoring, Info',
    },
    url: 'https://monitoringdesquartiers.brussels/a-propos',
  },
  ordonnancePauvrete2006: {
    libelle: {
      fr: 'Ordonnance du 20 juillet 2006 (Moniteur belge du 21 août 2006)',
      nl: 'Ordonnantie van 20 juli 2006 (Belgisch Staatsblad van 21 augustus 2006)',
      en: 'Ordinance of 20 July 2006 (Belgian Official Gazette, 21 August 2006)',
      de: 'Ordonnanz vom 20. Juli 2006 (Belgisches Staatsblatt vom 21. August 2006)',
    },
    url: 'https://www.ejustice.just.fgov.be/cgi/article_body.pl?language=fr&caller=summary&pub_date=2006-08-21&numac=2006031382',
  },
  propositionPauvrete2006: {
    libelle: {
      fr: 'Proposition d’ordonnance B-68/1 (2005-2006), développements',
      nl: 'Voorstel van ordonnantie B-68/1 (2005-2006), toelichting',
      en: 'Draft ordinance B-68/1 (2005-2006), explanatory statement',
      de: 'Ordonnanzvorschlag B-68/1 (2005-2006), Begründung',
    },
    url: 'http://weblex.brussels/data/arccc/doc/2005-06/102054/images.pdf',
  },
  ordonnanceRevitalisation2016: {
    libelle: {
      fr: 'Ordonnance organique de la revitalisation urbaine du 6 octobre 2016',
      nl: 'Organieke ordonnantie van 6 oktober 2016 houdende de stedelijke herwaardering',
      en: 'Organic ordinance on urban revitalisation of 6 October 2016',
      de: 'Organische Ordonnanz vom 6. Oktober 2016 über die städtische Revitalisierung',
    },
    url: 'https://publication.urban.brussels/DRU_DSV/COM/Liens_doc_site_quartiers/Ordonnance_organique_6_10_2016.pdf',
  },
  contratEcole: {
    libelle: {
      fr: 'perspective.brussels, Contrat École',
      nl: 'perspective.brussels, Schoolcontract',
      en: 'perspective.brussels, School contract',
      de: 'perspective.brussels, Schulvertrag',
    },
    url: 'https://perspective.brussels/fr/outils-de-planification/plans-et-programmes-dinitiative-regionale/contrat-ecole',
  },
  beliris: {
    libelle: { fr: 'Beliris, qui sommes-nous', nl: 'Beliris, wie zijn we', en: 'Beliris, about', de: 'Beliris, über uns' },
    url: 'https://www.beliris.be/qui-sommes-nous/',
  },
  competencesParlement: {
    libelle: {
      fr: 'Parlement bruxellois, les compétences',
      nl: 'Brussels Parlement, de bevoegdheden',
      en: 'Brussels Parliament, powers',
      de: 'Brüsseler Parlament, Zuständigkeiten',
    },
    url: 'https://www.parlement.brussels/les-competences/',
  },
  financementsCqd: {
    libelle: {
      fr: 'quartiers.brussels, financements',
      nl: 'quartiers.brussels, financiering',
      en: 'quartiers.brussels, funding',
      de: 'quartiers.brussels, Finanzierung',
    },
    url: 'https://quartiers.brussels/1/page/programmes/financements',
  },
  loiIntegration2002: {
    libelle: {
      fr: 'Loi du 26 mai 2002 concernant le droit à l’intégration sociale, art. 2',
      nl: 'Wet van 26 mei 2002 betreffende het recht op maatschappelijke integratie, art. 2',
      en: 'Law of 26 May 2002 on the right to social integration, art. 2',
      de: 'Gesetz vom 26. Mai 2002 über das Recht auf soziale Eingliederung, Art. 2',
    },
    url: 'https://www.ejustice.just.fgov.be/eli/loi/2002/05/26/2002022559/justel',
  },
  sppIntegration: {
    libelle: {
      fr: 'SPP Intégration sociale',
      nl: 'POD Maatschappelijke Integratie',
      en: 'PPS Social Integration',
      de: 'ÖPD Sozialeingliederung',
    },
    url: 'https://www.mi-is.be/fr/droit-lintegration-sociale',
  },
  loiCpas1976: {
    libelle: {
      fr: 'Loi organique des CPAS du 8 juillet 1976 (forme bruxelloise), art. 1, 2 et 57',
      nl: 'Organieke wet van 8 juli 1976 betreffende de OCMW’s (Brusselse versie), art. 1, 2 en 57',
      en: 'Organic law on CPAS of 8 July 1976 (Brussels version), arts. 1, 2 and 57',
      de: 'Organisches Gesetz vom 8. Juli 1976 über die ÖSHZ (Brüsseler Fassung), Art. 1, 2 und 57',
    },
    url: 'https://www.ejustice.just.fgov.be/cgi_loi/article.pl?language=fr&lg_txt=f&type=&sort=&numac_search=&cn_search=1976070837&caller=eli&&view_numac=1976070837fr',
  },
} as const satisfies Record<string, { libelle: Record<Locale, string>; url: string }>;

export type CleSource = keyof typeof SOURCES_MATRICE;

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
  /** Sources de chaque case remplie, affichées sous la matrice. */
  sources: Partial<Record<CleNiveau, CleSource[]>>;
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
        fr: 'Rapport sur l’état de la pauvreté, dont le baromètre social annuel, sous la responsabilité du Collège réuni (ordonnance du 20 juillet 2006), rédigé par l’Observatoire de la Santé et du Social',
        nl: 'Armoederapport, met de jaarlijkse sociale barometer, onder de verantwoordelijkheid van het Verenigd College (ordonnantie van 20 juli 2006), opgesteld door het Observatorium voor Gezondheid en Welzijn',
        en: 'Report on the state of poverty, including the annual social barometer, under the responsibility of the United College (ordinance of 20 July 2006), written by the Health and Social Observatory',
        de: 'Bericht über den Stand der Armut, einschließlich des jährlichen Sozialbarometers, unter der Verantwortung des Vereinigten Kollegiums (Ordonnanz vom 20. Juli 2006), verfasst von der Beobachtungsstelle für Gesundheit und Soziales',
      },
    },
    sources: {
      regional: ['monitoring'],
      cocom: ['ordonnancePauvrete2006', 'propositionPauvrete2006'],
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
        fr: 'Le Gouvernement régional fixe le périmètre en tenant compte au minimum de trois conditions cumulatives par secteur statistique (revenu, densité, chômage) ; il peut y inclure ou en exclure certains secteurs (ordonnance du 6 octobre 2016, art. 5)',
        nl: 'De gewestregering legt de perimeter vast rekening houdend met minstens drie cumulatieve voorwaarden per statistische sector (inkomen, dichtheid, werkloosheid); ze kan bepaalde sectoren toevoegen of uitsluiten (ordonnantie van 6 oktober 2016, art. 5)',
        en: 'The regional Government sets the boundary taking into account at least three cumulative conditions per statistical sector (income, density, unemployment); it may include or exclude certain sectors (ordinance of 6 October 2016, art. 5)',
        de: 'Die Regionalregierung legt die Abgrenzung unter Berücksichtigung von mindestens drei kumulativen Bedingungen je statistischem Sektor fest (Einkommen, Dichte, Arbeitslosigkeit); sie kann bestimmte Sektoren einbeziehen oder ausschließen (Ordonnanz vom 6. Oktober 2016, Art. 5)',
      },
    },
    sources: {
      regional: ['ordonnanceRevitalisation2016'],
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
        fr: 'Contribution d’au moins 5 % du montant de chaque contrat de quartier durable',
        nl: 'Bijdrage van minstens 5 % van het bedrag van elk duurzaam wijkcontract',
        en: 'Contribution of at least 5% of the amount of each sustainable neighbourhood contract',
        de: 'Beitrag von mindestens 5 % des Betrags jedes nachhaltigen Quartiersvertrags',
      },
    },
    sources: {
      federal: ['beliris'],
      regional: ['competencesParlement', 'ordonnanceRevitalisation2016', 'contratEcole'],
      communal: ['financementsCqd'],
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
        fr: 'CPAS, un par commune : aide sociale et revenu d’intégration',
        nl: 'OCMW, één per gemeente: maatschappelijke dienstverlening en leefloon',
        en: 'CPAS (public social welfare centres), one per municipality: social assistance and integration income',
        de: 'ÖSHZ, eines je Gemeinde: Sozialhilfe und Eingliederungseinkommen',
      },
    },
    sources: {
      federal: ['loiIntegration2002', 'sppIntegration'],
      cocom: ['competencesParlement'],
      communal: ['loiCpas1976', 'loiIntegration2002'],
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

export const LIBELLE_SOURCES: Record<Locale, string> = {
  fr: 'Sources :',
  nl: 'Bronnen:',
  en: 'Sources:',
  de: 'Quellen:',
};

/** Sources effectivement citées par au moins une case, dans l'ordre de première apparition. */
export function sourcesCitees(): CleSource[] {
  const vues: CleSource[] = [];
  for (const l of LIGNES) {
    for (const n of NIVEAUX) {
      for (const cle of l.sources[n.cle] ?? []) if (!vues.includes(cle)) vues.push(cle);
    }
  }
  return vues;
}
