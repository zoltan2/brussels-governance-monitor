// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Locale } from './types';

/**
 * Programmes publics qui visent les quartiers pauvres de Bruxelles : ce qui a été
 * promis (programmé, attribué, engagé), ce qui a été fait, et ce qui a été évalué.
 *
 * Saisi à la main depuis l'enquête `01-geographie-pauvrete.md` (§3 et §4). Chaque
 * valeur a été relue dans sa source le 24/09/2026 (voir le rapport de la tâche 15,
 * qui cite la phrase ou la cellule de tableau d'origine). Règles :
 * - `null` quand la source ne publie rien, jamais 0 ni chaîne vide ;
 * - « Évalué » seulement pour une évaluation publiée (rapport, audit), avec sa date ;
 * - montants repris tels quels, avec leur année et leur périmètre, jamais additionnés.
 *
 * Les montants sont écrits en texte dans le format de chaque langue (fr : espace
 * insécable U+00A0 pour les milliers, virgule décimale).
 */

export type SourceProgramme = {
  /** Nom de domaine du site qui publie la source : neutre d'une langue à l'autre. */
  libelle: string;
  url: string;
};

export type Programme = {
  id: string;
  libelle: Record<Locale, string>;
  promis: Record<Locale, string>;
  fait: Record<Locale, string | null>;
  evalue: Record<Locale, string | null>;
  /** Source de la ligne, et des colonnes Promis, Fait et Évalué quand aucune source propre n'est donnée. */
  source: SourceProgramme;
  /** Source de la colonne Promis, quand elle s'ajoute à `source` (second élément de la cellule). */
  sourcePromis?: SourceProgramme;
  /** Source de la colonne Fait, quand elle diffère de `source`. */
  sourceFait?: SourceProgramme;
  /**
   * Libellé propre à la ligne quand `fait` est null, pour préciser le périmètre de l'absence
   * (ex. un bilan publié seulement toutes régions confondues). Sinon, libellé générique « non publié ».
   */
  faitNonPublie?: Record<Locale, string>;
  /**
   * Source de la colonne Évalué, quand elle diffère de `source`. Un tableau quand plusieurs
   * évaluations distinctes sont citées dans le même texte (ex. contrats de quartier : audit de
   * 2001 et évaluation d'ensemble de 2018), chacune avec son propre lien.
   */
  sourceEvalue?: SourceProgramme | SourceProgramme[];
};

/**
 * Hôtes admis en http. weblex.brussels (documents du Parlement bruxellois) répond en
 * https avec un certificat qui ne couvre pas ce nom d'hôte (constaté le 24/09/2026 :
 * « no alternative certificate subject name matches target host name ») : on garde
 * l'URL http réelle plutôt qu'une URL https qui échouerait chez le lecteur.
 */
export const HOTES_HTTP_AUTORISES: readonly string[] = ['weblex.brussels'];

const NBSP = ' ';

/** Évaluation régionale d'avril 2018, commune aux contrats de quartier et aux contrats de quartier durables. */
const EVALUATION_2018: SourceProgramme = {
  libelle: 'publication.urban.brussels',
  url: 'https://publication.urban.brussels/DRU_DSV/COM/Liens_doc_site_quartiers/EVAL_CQD_Rapport%20final_FR_03092018.pdf',
};

const EVALUE_2018: Record<Locale, string> = {
  fr: "Évaluation réalisée par BDO pour Bruxelles Urbanisme & Patrimoine, rapport final d'avril 2018 : 12 contrats de quartier et 22 contrats de quartier durables entrepris entre janvier 2007 et janvier 2017. Conclusion : des interventions pertinentes par rapport aux besoins des Bruxelloises et des Bruxellois, mais sans l'amplitude suffisante pour influencer structurellement les indicateurs régionaux.",
  nl: 'Evaluatie uitgevoerd door BDO voor Brussel Stedenbouw en Erfgoed (urban.brussels), eindrapport van april 2018: 12 wijkcontracten en 22 duurzame wijkcontracten gestart tussen januari 2007 en januari 2017. Conclusie: ingrepen die relevant zijn voor de behoeften van de Brusselaars, maar zonder voldoende omvang om de gewestelijke indicatoren structureel te beïnvloeden.',
  en: 'Evaluation carried out by BDO for Brussels Urbanism and Heritage (urban.brussels), final report of April 2018: 12 neighbourhood contracts and 22 sustainable neighbourhood contracts started between January 2007 and January 2017. Conclusion: interventions relevant to the needs of Brussels residents, but without sufficient scale to structurally influence regional indicators.',
  de: 'Evaluierung durch BDO im Auftrag von Bruxelles Urbanisme & Patrimoine (urban.brussels), Abschlussbericht vom April 2018: 12 Quartiersverträge und 22 nachhaltige Quartiersverträge, begonnen zwischen Januar 2007 und Januar 2017. Fazit: Maßnahmen, die dem Bedarf der Brüsselerinnen und Brüsseler entsprechen, deren Umfang jedoch nicht ausreicht, um die regionalen Indikatoren strukturell zu beeinflussen.',
};

/**
 * Audit de la Cour des comptes sur les six premiers contrats de quartier (initiés en 1994),
 * publié dans son 158e Cahier / 12e Cahier d'observations (session 2001-2002), table des
 * matières : « Mise en œuvre des premiers « Contrats de quartier » en Région de
 * Bruxelles-Capitale », pages 14 à 59 (URL vérifiée HTTP 200 le 24/09/2026, Tâche 17).
 */
const AUDIT_CCREK_2001: SourceProgramme = {
  libelle: 'ccrek.be',
  url: 'https://www.ccrek.be/sites/default/files/Docs/158e_12e_b_opm_c_obs_br.pdf',
};

/** Les deux évaluations publiées des contrats de quartier (1994-2013) : l'audit ciblé de 2001 et l'évaluation d'ensemble de 2018 (partagée avec les CQD, EVALUE_2018). */
const EVALUE_CQ: Record<Locale, string> = {
  fr: "Audit de la Cour des comptes sur les six premiers contrats de quartier (initiés en 1994) : contrôle de légalité et de régularité des dépenses, rapport définitif envoyé le 28 février 2001 (158e Cahier, 12e Cahier d'observations, pages 14 à 59). Dernière évaluation d'ensemble, confiée à BDO pour Bruxelles Urbanisme & Patrimoine, avril 2018 : 12 des 13 séries de contrats de quartier (entreprises entre janvier 2007 et janvier 2017) incluses, conclusion : des interventions pertinentes par rapport aux besoins des Bruxelloises et des Bruxellois, mais sans l'amplitude suffisante pour influencer structurellement les indicateurs régionaux.",
  nl: 'Audit van het Rekenhof over de eerste zes wijkcontracten (gestart in 1994): wettigheids- en regelmatigheidscontrole van de uitgaven, definitief verslag verzonden op 28 februari 2001 (158e Boek, 12e Boek met opmerkingen, bladzijden 14 tot 59). Laatste globale evaluatie, toevertrouwd aan BDO voor Brussel Stedenbouw en Erfgoed (urban.brussels), april 2018: 12 van de 13 reeksen wijkcontracten (gestart tussen januari 2007 en januari 2017) opgenomen, conclusie: ingrepen die relevant zijn voor de behoeften van de Brusselaars, maar zonder voldoende omvang om de gewestelijke indicatoren structureel te beïnvloeden.',
  en: 'Audit by the Belgian Court of Audit on the first six neighbourhood contracts (started in 1994): a legality and regularity check of the expenditure, final report sent on 28 February 2001 (158th Cahier, 12th Cahier of observations, pages 14 to 59). Last overall evaluation, entrusted to BDO for Brussels Urbanism and Heritage (urban.brussels), April 2018: 12 of the 13 series of neighbourhood contracts (started between January 2007 and January 2017) included, conclusion: interventions relevant to the needs of Brussels residents, but without sufficient scale to structurally influence regional indicators.',
  de: 'Prüfung durch den belgischen Rechnungshof zu den ersten sechs Quartiersverträgen (gestartet 1994): Rechtmäßigkeits- und Ordnungsmäßigkeitsprüfung der Ausgaben, Abschlussbericht übermittelt am 28. Februar 2001 (158. Cahier, 12. Cahier d’observations, Seiten 14 bis 59). Letzte Gesamtevaluierung, in Auftrag gegeben an BDO für Bruxelles Urbanisme & Patrimoine (urban.brussels), April 2018: 12 der 13 Serien von Quartiersverträgen (begonnen zwischen Januar 2007 und Januar 2017) einbezogen, Fazit: Maßnahmen, die dem Bedarf der Brüsselerinnen und Brüsseler entsprechen, deren Umfang jedoch nicht ausreicht, um die regionalen Indikatoren strukturell zu beeinflussen.',
};

export const PROGRAMMES: Programme[] = [
  {
    id: 'contrats-quartier',
    libelle: {
      fr: 'Contrats de quartier (1994-2013)',
      nl: 'Wijkcontracten (1994-2013)',
      en: 'Neighbourhood contracts (1994-2013)',
      de: 'Quartiersverträge (1994-2013)',
    },
    promis: {
      fr: `13 séries de 1994 à 2013, avec une attribution budgétaire publiée par série : de 28${NBSP}507${NBSP}755 euros (série 3, 1999-2003) à 70${NBSP}237${NBSP}016 euros (série 12, 2008-2012) ; 194${NBSP}881${NBSP}409 euros engagés par la Région de 1994 à 2004 (état au 31 août 2005, réponse à la question écrite n° 177 au Parlement bruxellois).`,
      nl: '13 reeksen van 1994 tot 2013, met een gepubliceerde budgettaire toewijzing per reeks: van 28.507.755 euro (reeks 3, 1999-2003) tot 70.237.016 euro (reeks 12, 2008-2012); 194.881.409 euro vastgelegd door het Gewest van 1994 tot 2004 (stand op 31 augustus 2005, antwoord op schriftelijke vraag nr. 177 in het Brussels Parlement).',
      en: '13 series from 1994 to 2013, with a published budget allocation per series: from €28,507,755 (series 3, 1999-2003) to €70,237,016 (series 12, 2008-2012); €194,881,409 committed by the Region from 1994 to 2004 (position at 31 August 2005, answer to written question no. 177 in the Brussels Parliament).',
      de: '13 Serien von 1994 bis 2013, mit einer veröffentlichten Mittelzuweisung je Serie: von 28.507.755 Euro (Serie 3, 1999-2003) bis 70.237.016 Euro (Serie 12, 2008-2012); 194.881.409 Euro von der Region von 1994 bis 2004 gebunden (Stand 31. August 2005, Antwort auf die schriftliche Frage Nr. 177 im Brüsseler Parlament).',
    },
    // Des engagements ne sont pas des réalisations : les 194 881 409 euros sont dans Promis.
    // Aucun bilan de réalisation publié pour cette génération.
    fait: { fr: null, nl: null, en: null, de: null },
    evalue: EVALUE_CQ,
    source: { libelle: 'quartiers.brussels', url: 'https://quartiers.brussels/1/page/programmes' },
    sourcePromis: {
      libelle: 'weblex.brussels',
      url: 'http://weblex.brussels/data/crb/bqr/2005-06/00013/images.pdf',
    },
    sourceEvalue: [AUDIT_CCREK_2001, EVALUATION_2018],
  },
  {
    id: 'contrats-quartier-durables',
    libelle: {
      fr: 'Contrats de quartier durables (depuis 2010)',
      nl: 'Duurzame wijkcontracten (sinds 2010)',
      en: 'Sustainable neighbourhood contracts (since 2010)',
      de: 'Nachhaltige Quartiersverträge (seit 2010)',
    },
    promis: {
      fr: `14,125 millions d’euros de la Région par programme, plus une contribution communale d’au moins 5${NBSP}% du montant du programme ; deux à trois programmes soutenus chaque année.`,
      nl: `14,125 miljoen euro van het Gewest per programma, plus een gemeentelijke bijdrage van minstens 5${NBSP}% van het programmabedrag; elk jaar worden twee tot drie programma’s gesteund.`,
      en: '€14.125 million from the Region per programme, plus a municipal contribution of at least 5% of the programme amount; two to three programmes supported each year.',
      de: `14,125 Millionen Euro der Region je Programm, zuzüglich eines Gemeindebeitrags von mindestens 5${NBSP}% des Programmbetrags; jedes Jahr werden zwei bis drei Programme unterstützt.`,
    },
    // Le même site publie 1 903 logements (page d'accueil) et 1 673 (page « Chiffres-clés ») :
    // chiffre contradictoire, non repris.
    fait: { fr: null, nl: null, en: null, de: null },
    evalue: EVALUE_2018,
    source: { libelle: 'quartiers.brussels', url: 'https://quartiers.brussels/1/page/programmes/financements' },
    sourceEvalue: EVALUATION_2018,
  },
  {
    id: 'contrats-renovation-urbaine',
    libelle: {
      fr: 'Contrats de rénovation urbaine (depuis 2017)',
      nl: 'Stadsvernieuwingscontracten (sinds 2017)',
      en: 'Urban renovation contracts (since 2017)',
      de: 'Stadterneuerungsverträge (seit 2017)',
    },
    promis: {
      fr: `22${NBSP}000${NBSP}000 euros d’investissement par contrat pour les contrats 1 à 7, complétés d’autres budgets publics et privés ; lancement d’un contrat 8 approuvé le 7 juillet 2022.`,
      nl: '22.000.000 euro investering per contract voor de contracten 1 tot 7, aangevuld met andere openbare en private budgetten; de start van een contract 8 werd op 7 juli 2022 goedgekeurd.',
      en: '€22,000,000 of investment per contract for contracts 1 to 7, supplemented by other public and private budgets; the launch of a contract 8 was approved on 7 July 2022.',
      de: '22.000.000 Euro Investition je Vertrag für die Verträge 1 bis 7, ergänzt durch weitere öffentliche und private Mittel; der Start eines Vertrags 8 wurde am 7. Juli 2022 genehmigt.',
    },
    // La page annonce que la mise en œuvre des cinq premiers « sera finalisée mi-2025 » :
    // une prévision, pas un bilan.
    fait: { fr: null, nl: null, en: null, de: null },
    evalue: { fr: null, nl: null, en: null, de: null },
    source: {
      libelle: 'perspective.brussels',
      url: 'https://perspective.brussels/fr/outils-de-planification/plans-et-programmes-dinitiative-regionale/cru',
    },
  },
  {
    id: 'contrats-ecole',
    libelle: {
      fr: 'Contrats école (ordonnance du 16 mai 2019)',
      nl: 'Schoolcontracten (ordonnantie van 16 mei 2019)',
      en: 'School contracts (ordinance of 16 May 2019)',
      de: 'Schulverträge (Ordonnanz vom 16. Mai 2019)',
    },
    promis: {
      fr: '2,5 millions d’euros au maximum par contrat, sur quatre ans, pour des écoles situées dans la zone de revitalisation urbaine qui accueillent un public scolaire fragilisé.',
      nl: 'Maximaal 2,5 miljoen euro per contract, over vier jaar, voor scholen in de zone voor stedelijke herwaardering met een kwetsbare schoolbevolking.',
      en: 'Up to €2.5 million per contract, over four years, for schools located in the urban revitalisation zone that serve a vulnerable pupil population.',
      de: 'Höchstens 2,5 Millionen Euro je Vertrag, über vier Jahre, für Schulen in der städtischen Revitalisierungszone mit einer benachteiligten Schülerschaft.',
    },
    fait: { fr: null, nl: null, en: null, de: null },
    evalue: { fr: null, nl: null, en: null, de: null },
    source: {
      libelle: 'perspective.brussels',
      url: 'https://perspective.brussels/fr/outils-de-planification/plans-et-programmes-dinitiative-regionale/contrat-ecole',
    },
  },
  {
    id: 'politique-ville-axe-2',
    libelle: {
      fr: 'Politique de la Ville, axe 2 : développement des quartiers',
      nl: 'Stadsbeleid, as 2: wijkontwikkeling',
      en: 'City Policy, strand 2: neighbourhood development',
      de: 'Stadtpolitik, Achse 2: Quartiersentwicklung',
    },
    promis: {
      fr: 'Programmes pluriannuels 2021-2025 de 18 communes, approuvés le 3 décembre 2020 (5 programmes) et le 25 février 2021 (13 programmes), mis en œuvre dans la zone de revitalisation urbaine. Montant non indiqué sur la page.',
      nl: 'Meerjarenprogramma’s 2021-2025 van 18 gemeenten, goedgekeurd op 3 december 2020 (5 programma’s) en op 25 februari 2021 (13 programma’s), uitgevoerd in de zone voor stedelijke herwaardering. Bedrag niet vermeld op de pagina.',
      en: 'Multi-year programmes 2021-2025 of 18 municipalities, approved on 3 December 2020 (5 programmes) and 25 February 2021 (13 programmes), implemented in the urban revitalisation zone. Amount not stated on the page.',
      de: 'Mehrjahresprogramme 2021-2025 von 18 Gemeinden, genehmigt am 3. Dezember 2020 (5 Programme) und am 25. Februar 2021 (13 Programme), umgesetzt in der städtischen Revitalisierungszone. Betrag auf der Seite nicht angegeben.',
    },
    fait: { fr: null, nl: null, en: null, de: null },
    evalue: { fr: null, nl: null, en: null, de: null },
    source: { libelle: 'quartiers.brussels', url: 'https://quartiers.brussels/3/' },
  },
  {
    id: 'beliris-revitalisation',
    libelle: {
      fr: 'Beliris (budget fédéral), domaine « revitalisation et développement urbain », 2023',
      nl: 'Beliris (federaal budget), domein stedelijke herwaardering en ontwikkeling, 2023',
      en: 'Beliris (federal budget), urban revitalisation and development area, 2023',
      de: 'Beliris (föderaler Haushalt), Bereich Stadtrevitalisierung und Stadtentwicklung, 2023',
    },
    promis: {
      fr: `28${NBSP}960${NBSP}536,62 euros engagés en 2023.`,
      nl: '28.960.536,62 euro vastgelegd in 2023.',
      en: '€28,960,536.62 committed in 2023.',
      de: '28.960.536,62 Euro im Jahr 2023 gebunden.',
    },
    fait: {
      fr: `32${NBSP}591${NBSP}282,36 euros liquidés en 2023.`,
      nl: '32.591.282,36 euro vereffend in 2023.',
      en: '€32,591,282.36 paid out in 2023.',
      de: '32.591.282,36 Euro im Jahr 2023 ausgezahlt.',
    },
    evalue: { fr: null, nl: null, en: null, de: null },
    source: {
      libelle: 'beliris.be',
      url: 'https://www.beliris.be/files/files/general/rapport-annuel/Rapport_annuel_FR_2023_web_Vfinale.pdf',
    },
  },
  {
    id: 'feder-2007-2013',
    libelle: {
      fr: 'FEDER 2007-2013 (Union européenne et Région)',
      nl: 'EFRO 2007-2013 (Europese Unie en Gewest)',
      en: 'ERDF 2007-2013 (European Union and Region)',
      de: 'EFRE 2007-2013 (Europäische Union und Region)',
    },
    promis: {
      fr: '115 millions d’euros pour l’ensemble du programme (deux axes), cofinancés par l’Union européenne et la Région.',
      nl: '115 miljoen euro voor het hele programma (twee assen), gecofinancierd door de Europese Unie en het Gewest.',
      en: '€115 million for the whole programme (two strands), co-financed by the European Union and the Region.',
      de: '115 Millionen Euro für das gesamte Programm (zwei Achsen), kofinanziert von der Europäischen Union und der Region.',
    },
    fait: {
      fr: '34 projets réalisés.',
      nl: '34 projecten uitgevoerd.',
      en: '34 projects carried out.',
      de: '34 Projekte umgesetzt.',
    },
    evalue: { fr: null, nl: null, en: null, de: null },
    source: { libelle: 'feder.brussels', url: 'https://feder.brussels/programmation-2007-2013/' },
  },
  {
    id: 'feder-2014-2020',
    libelle: {
      fr: 'FEDER 2014-2020 (Union européenne et Région)',
      nl: 'EFRO 2014-2020 (Europese Unie en Gewest)',
      en: 'ERDF 2014-2020 (European Union and Region)',
      de: 'EFRE 2014-2020 (Europäische Union und Region)',
    },
    promis: {
      fr: 'Appel à projets de 200 millions d’euros lancé le 12 mai 2014 ; l’un de ses axes vise à améliorer le cadre de vie des quartiers et des populations défavorisées.',
      nl: 'Projectoproep van 200 miljoen euro, gelanceerd op 12 mei 2014; een van de assen wil de leefomgeving van kansarme wijken en bevolkingsgroepen verbeteren.',
      en: 'Call for projects of €200 million launched on 12 May 2014; one of its strands aims to improve the living environment of disadvantaged neighbourhoods and populations.',
      de: 'Projektaufruf über 200 Millionen Euro, gestartet am 12. Mai 2014; eine der Achsen soll das Lebensumfeld benachteiligter Quartiere und Bevölkerungsgruppen verbessern.',
    },
    fait: {
      fr: '58 projets sélectionnés, tous axes confondus : 46 le 21 mai 2015, 12 le 6 juin 2019.',
      nl: '58 projecten geselecteerd, alle assen samen: 46 op 21 mei 2015, 12 op 6 juni 2019.',
      en: '58 projects selected, all strands combined: 46 on 21 May 2015, 12 on 6 June 2019.',
      de: '58 Projekte ausgewählt, alle Achsen zusammen: 46 am 21. Mai 2015, 12 am 6. Juni 2019.',
    },
    evalue: { fr: null, nl: null, en: null, de: null },
    source: { libelle: 'feder.brussels', url: 'https://feder.brussels/programmation-2014-2020/' },
  },
  {
    id: 'feder-2021-2027-p4',
    libelle: {
      fr: 'FEDER 2021-2027, priorité 4 (développement urbain)',
      nl: 'EFRO 2021-2027, prioriteit 4 (stedelijke ontwikkeling)',
      en: 'ERDF 2021-2027, priority 4 (urban development)',
      de: 'EFRE 2021-2027, Priorität 4 (Stadtentwicklung)',
    },
    promis: {
      fr: `27${NBSP}288${NBSP}925,00 euros au total, dont 10${NBSP}915${NBSP}570,00 euros du FEDER, en soutien aux contrats de quartier durables et aux contrats de rénovation urbaine.`,
      nl: '27.288.925,00 euro in totaal, waarvan 10.915.570,00 euro uit het EFRO, ter ondersteuning van de duurzame wijkcontracten en de stadsvernieuwingscontracten.',
      en: '€27,288,925.00 in total, of which €10,915,570.00 from the ERDF, supporting the sustainable neighbourhood contracts and the urban renovation contracts.',
      de: '27.288.925,00 Euro insgesamt, davon 10.915.570,00 Euro aus dem EFRE, zur Unterstützung der nachhaltigen Quartiersverträge und der Stadterneuerungsverträge.',
    },
    fait: { fr: null, nl: null, en: null, de: null },
    evalue: { fr: null, nl: null, en: null, de: null },
    source: { libelle: 'feder.brussels', url: 'https://feder.brussels/wp-content/uploads/2023/05/Programme-FEDER21-27.pdf' },
  },
  {
    id: 'grandes-villes-2005-2007',
    libelle: {
      fr: 'Politique fédérale des grandes villes : contrats de ville et de logement 2005-2007',
      nl: 'Federaal grootstedenbeleid: stadscontracten en huisvestingscontracten 2005-2007',
      en: 'Federal major cities policy: city contracts and housing contracts 2005-2007',
      de: 'Föderale Großstadtpolitik: Stadtverträge und Wohnungsverträge 2005-2007',
    },
    promis: {
      fr: `48${NBSP}604${NBSP}213 euros de subsides accordés pour 2005-2007 aux sept communes bruxelloises retenues.`,
      nl: '48.604.213 euro subsidies toegekend voor 2005-2007 aan de zeven geselecteerde Brusselse gemeenten.',
      en: '€48,604,213 in subsidies granted for 2005-2007 to the seven Brussels municipalities selected.',
      de: '48.604.213 Euro Zuschüsse für 2005-2007 an die sieben ausgewählten Brüsseler Gemeinden.',
    },
    // L'audit ne publie l'état des dépenses que toutes régions confondues (tableau 2) :
    // aucun chiffre de réalisation pour les communes bruxelloises.
    fait: { fr: null, nl: null, en: null, de: null },
    faitNonPublie: {
      fr: 'non publié pour Bruxelles',
      nl: 'niet gepubliceerd voor Brussel',
      en: 'not published for Brussels',
      de: 'für Brüssel nicht veröffentlicht',
    },
    evalue: {
      fr: 'Audit de la Cour des comptes, rapport adopté le 21 novembre 2007 et transmis à la Chambre des représentants.',
      nl: 'Audit van het Rekenhof, verslag goedgekeurd op 21 november 2007 en bezorgd aan de Kamer van volksvertegenwoordigers.',
      en: 'Audit by the Belgian Court of Audit, report adopted on 21 November 2007 and sent to the Chamber of Representatives.',
      de: 'Prüfung durch den belgischen Rechnungshof, Bericht angenommen am 21. November 2007 und der Abgeordnetenkammer übermittelt.',
    },
    source: {
      libelle: 'ccrek.be',
      url: 'https://www.ccrek.be/sites/default/files/Docs/2008_01_PolitiqueFederaleDesGrandesVilles.pdf',
    },
  },
];
