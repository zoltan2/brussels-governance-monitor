// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Fraîcheur du texte d'impact des fiches secteur : `title`, `humanImpact`,
 * `activeMechanisms`.
 *
 * #619 (28/09/2026) a dû retirer de `sector-cards/education.*` un `humanImpact`
 * centré sur avril et un `activeMechanisms` qui décrivait les affaires courantes
 * de 2024, alors que la fiche avait été republiée les 24 et 27/09 (#579, #586,
 * #609). Chaque veille rafraîchit `lastModified` sans relire le reste : le
 * lecteur voit « Mis à jour le 27/09 » au-dessus d'un texte d'avril. La garde
 * du chapeau (summary-freshness) ne couvrait que domaines et dossiers.
 *
 * Même règle que le chapeau : `impactReviewed` (date de la dernière relecture
 * humaine de ces trois champs) doit être au plus 90 jours avant `lastModified`
 * à chaque republication. La date est une attestation : on la pose APRÈS avoir
 * relu, jamais en masse pour faire passer la garde.
 *
 * Module pur, sans accès disque.
 */

import { SUMMARY_MAX_AGE_DAYS, checkReviewFreshness, type ReviewLabels, type SummaryFreshness } from './summary-freshness';

export const IMPACT_MAX_AGE_DAYS = SUMMARY_MAX_AGE_DAYS;

const IMPACT_LABELS: ReviewLabels = {
  key: 'impactReviewed',
  missing:
    'impactReviewed absent. Relire title, humanImpact et activeMechanisms, puis ajouter impactReviewed avec la date du jour.',
  stale: (ageDays, maxAge) =>
    `texte d'impact relu il y a ${ageDays} jours (limite ${maxAge}). Relire title, humanImpact et activeMechanisms, ` +
    'puis passer impactReviewed à la date du jour.',
};

export function checkImpactFreshness(params: {
  lastModified: string | undefined;
  impactReviewed: string | undefined;
  draft?: boolean;
  maxAgeDays?: number;
  today?: string;
}): SummaryFreshness {
  return checkReviewFreshness(
    { ...params, reviewed: params.impactReviewed, maxAgeDays: params.maxAgeDays ?? IMPACT_MAX_AGE_DAYS },
    IMPACT_LABELS,
  );
}
