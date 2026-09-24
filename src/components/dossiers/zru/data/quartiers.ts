// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// Écrit à la main : libellés et provenance de l'indicateur 2498 (valeurs dans quartiers-brut.ts).

import { QUARTIERS_VALEURS_BRUTS, SEUILS_PALIERS } from './quartiers-brut';
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

/** Millésime affiché par le Monitoring des Quartiers (voir la réserve dans PROVENANCE_QUARTIERS). */
export const ANNEE_QUARTIERS = 2023;

export const PROVENANCE_QUARTIERS: Provenance = {
  producteur: 'IBSA & Statbel (Direction générale Statistique – Statistics Belgium) (Statistique fiscale des revenus), via le Monitoring des Quartiers',
  url: 'https://monitoringdesquartiers.brussels/Indicator/IndicatorPage/2498?tab=Sheet',
  sourceMiseAJour: null,
  extraitLe: '2026-09-24',
  licence: 'Réutilisation libre avec mention de la source (IBSA et Statbel pour l’indicateur 2498) et des modifications',
  modifications: [
    'millésime 2023, dernière année affichée par le Monitoring des Quartiers ; montants en euros',
    'réserve : le libellé du millésime est 2023, mais la description de l’indicateur commence par « En 2022 » ; à vérifier avant de citer l’année',
    'jointure MD_ID (WFS PER_A10_C1_MONITORING_QUARTIER) ↔ code du quartier (Geodata perspective.brussels)',
    '27 quartiers non habités ou trop peu peuplés sans valeur publiée : laissés vides, jamais à zéro',
    'répartition en 5 paliers par quantiles des 118 quartiers avec valeur, calcul BGM',
  ],
  confiance: 'official',
};
