// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Un `changeSummary` écrit ou réécrit doit porter sa `changeSummaryDate`.
 *
 * `WhatChangedBanner` n'affiche le résumé que si la date est présente et de
 * moins de 30 jours (src/components/what-changed-banner.tsx). Sans elle, le
 * bandeau reste vide sans aucun signal : constat du 2026-09-11, 84 dossiers sur
 * 120 avaient un résumé sans date, dont les deux fiches de la veille de la
 * veille (lez, housing-sector). Le protocole de veille disait seulement
 * « mettre à jour changeSummary ».
 *
 * La garde ne regarde que les résumés touchés par la PR : un ancien résumé
 * sans date n'affiche plus rien de toute façon, et le dater après coup
 * inventerait une date.
 *
 * Module sans accès disque : l'appelant fournit les deux versions.
 */

export interface ChangeSummaryFields {
  changeSummary?: string;
  changeSummaryDate?: string;
  lastModified?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Message d'erreur, ou null si la fiche est en règle. */
export function changeSummaryDateProblem(
  before: ChangeSummaryFields | null,
  after: ChangeSummaryFields,
): string | null {
  const summary = after.changeSummary?.trim();
  if (!summary) return null;
  const touched = !before || (before.changeSummary?.trim() ?? '') !== summary;
  if (!touched) return null;

  const date = after.changeSummaryDate;
  if (!date) {
    return 'changeSummary écrit sans changeSummaryDate : le bandeau « ce qui a changé » ne s\'affichera pas. Ajouter changeSummaryDate à la date de la mise à jour (en général lastModified).';
  }
  if (!ISO_DATE.test(date)) return `changeSummaryDate illisible (${date}), format attendu AAAA-MM-JJ.`;
  if (after.lastModified && ISO_DATE.test(after.lastModified) && date > after.lastModified) {
    return `changeSummaryDate (${date}) postérieure à lastModified (${after.lastModified}).`;
  }
  return null;
}
