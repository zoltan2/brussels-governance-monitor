// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// Écrit à la main : libellés et provenance de l'indicateur 2498 (valeurs dans quartiers-brut.ts).

import { EXTRAIT_LE_QUARTIERS, QUARTIERS_VALEURS_BRUTS, SEUILS_PALIERS } from './quartiers-brut';
import type { Locale, Provenance } from './types';

export { SEUILS_PALIERS };
export const QUARTIERS_VALEURS = QUARTIERS_VALEURS_BRUTS;

/** fr et nl : intitulés publiés par le Monitoring des Quartiers ; en et de : traductions BGM. */
export const INDICATEUR_QUARTIERS: Record<Locale, string> = {
  fr: 'Revenu équivalent médian des habitant·es après impôt',
  nl: 'Mediaan equivalent inkomen der inwoners na belastingen',
  en: 'Median equivalised income of residents after tax',
  de: 'Medianes Äquivalenzeinkommen der Einwohnerinnen und Einwohner nach Steuern',
};

/**
 * Millésime affiché par le Monitoring des Quartiers : année de REVENUS, pas de publication
 * (vérifié le 24/09/2026, Tâche 17 : fiche indicateur 2498, « En 2023 » ; source 51, « année de
 * revenus » ; Statbel a publié les revenus 2023 le 19/11/2025).
 */
export const ANNEE_QUARTIERS = 2023;

const SANS = QUARTIERS_VALEURS_BRUTS.filter((q) => q.valeur === null).length;
const AVEC = QUARTIERS_VALEURS_BRUTS.length - SANS;

export const PROVENANCE_QUARTIERS: Provenance = {
  // Sigle par langue : IBSA en français, BISA en néerlandais ; IBSA en anglais et en allemand.
  producteur: { fr: 'IBSA & Statbel', nl: 'BISA & Statbel', en: 'IBSA & Statbel', de: 'IBSA & Statbel' },
  url: 'https://monitoringdesquartiers.brussels/Indicator/IndicatorPage/2498?tab=Sheet',
  sourceMiseAJour: null,
  extraitLe: EXTRAIT_LE_QUARTIERS,
  licence: {
    fr: 'réutilisation libre avec mention de la source (IBSA et Statbel pour l’indicateur 2498) et des modifications',
    nl: 'vrij hergebruik met vermelding van de bron (BISA en Statbel voor indicator 2498) en van de wijzigingen',
    en: 'free reuse with attribution of the source (IBSA and Statbel for indicator 2498) and of the changes',
    de: 'freie Weiterverwendung mit Angabe der Quelle (IBSA und Statbel für den Indikator 2498) und der Änderungen',
  },
  modifications: {
    fr: [
      'statistique fiscale des revenus de Statbel, publiée par le Monitoring des Quartiers (indicateur 2498)',
      'millésime 2023, dernière année affichée par le Monitoring des Quartiers\u00a0; montants en euros',
      'jointure MD_ID (WFS PER_A10_C1_MONITORING_QUARTIER) ↔ code du quartier (Geodata perspective.brussels)',
      `${SANS} quartiers non habités sans valeur publiée\u00a0: laissés vides, jamais à zéro`,
      `répartition en 5 paliers par quantiles des ${AVEC} quartiers avec valeur, calcul BGM`,
    ],
    nl: [
      'fiscale inkomensstatistiek van Statbel, gepubliceerd door de Wijkmonitoring (indicator 2498)',
      'jaargang 2023, het laatste jaar dat de Wijkmonitoring toont; bedragen in euro',
      'koppeling MD_ID (WFS PER_A10_C1_MONITORING_QUARTIER) ↔ wijkcode (Geodata perspective.brussels)',
      `${SANS} onbewoonde wijken zonder gepubliceerde waarde: leeg gelaten, nooit op nul`,
      `indeling in 5 klassen volgens kwantielen van de ${AVEC} wijken met een waarde, berekening BGM`,
    ],
    en: [
      'Statbel tax income statistics, published by the Brussels neighbourhood monitoring (indicator 2498)',
      '2023 edition, the latest year shown by the neighbourhood monitoring; amounts in euros',
      'MD_ID (WFS PER_A10_C1_MONITORING_QUARTIER) ↔ neighbourhood code join (Geodata perspective.brussels)',
      `${SANS} uninhabited neighbourhoods with no published value: left blank, never set to zero`,
      `split into 5 bands by quantiles of the ${AVEC} neighbourhoods with a value, BGM calculation`,
    ],
    de: [
      'Einkommensteuerstatistik von Statbel, veröffentlicht vom Brüsseler Quartiersmonitoring (Indikator 2498)',
      'Jahrgang 2023, das letzte vom Quartiersmonitoring angezeigte Jahr; Beträge in Euro',
      'Verknüpfung MD_ID (WFS PER_A10_C1_MONITORING_QUARTIER) ↔ Viertelcode (Geodata perspective.brussels)',
      `${SANS} unbewohnte Viertel ohne veröffentlichten Wert: leer gelassen, nie auf null gesetzt`,
      `Einteilung in 5 Stufen nach Quantilen der ${AVEC} Viertel mit Wert, Berechnung BGM`,
    ],
  },
  confiance: 'official',
};
