// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Texte de la barre « Dernière mise à jour » sous le héros de l'accueil.
 *
 * Module PUR : aucun accès à `.velite/` ni au changelog. La page lui passe
 * l'entrée du changelog et la fiche cible déjà résolues, ce qui permet de
 * l'éprouver sur des objets synthétiques (la CI lance les tests avant le build).
 *
 * Règle de sélection :
 *   1. La fiche cible a un `changeSummary` DANS LA LANGUE DEMANDÉE, dont la
 *      `changeSummaryDate` tombe le jour de l'entrée ou après → on affiche sa
 *      première phrase, calculée par `leadSplit`, soit le titre de l'email du digest (≤ 120 caractères,
 *      lisible seul). `digestHeadline` n'est volontairement pas pris : il n'est
 *      pas daté et peut coiffer une veille plus ancienne.
 *   2. Sinon (pas de fiche, fiche servie en repli français, résumé absent ou
 *      antérieur à l'entrée) → le texte actuel du changelog, `summary` puis
 *      `description`, intégral. L'affichage le laisse passer à la ligne.
 *
 * Une correction se dit en toutes lettres (étiquette « Correction »), jamais
 * par la seule couleur. Si le titre commence déjà par « Correction : », ce
 * préfixe est retiré pour ne pas le lire deux fois.
 */

import { leadSplit } from '@/lib/lead-split';
import { jourISO } from '@/lib/velite-date';

export type ChangelogType = 'added' | 'updated' | 'corrected' | 'removed';

/** Ce que la barre lit de la fiche cible (tous les types de fiche l'exposent). */
export interface TargetCardChange {
  title: string;
  changeSummary?: string;
  /** Jour ou horodatage Velite (`s.isodate()` rend un horodatage). */
  changeSummaryDate?: string;
  changeType?: string;
  /** Vrai si la fiche est la version française servie faute de traduction. */
  isFallback: boolean;
}

export interface LatestHeadlineInput {
  entryDate: string;
  entryType: ChangelogType;
  summary?: string;
  description: string;
  card: TargetCardChange | null;
}

export interface LatestHeadline {
  text: string;
  source: 'changeSummary' | 'changelog';
  isCorrection: boolean;
  cardTitle: string | null;
}

/** « Correction : », « Correctie: », « Korrektur: » en tête de phrase. */
const CORRECTION_PREFIX = /^(?:correction|correctie|korrektur)\s*:\s*/i;

export function stripCorrectionPrefix(text: string): string {
  const rest = text.replace(CORRECTION_PREFIX, '');
  if (rest === text || !rest) return text;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

function usableChangeSummary(card: TargetCardChange | null, entryDate: string): string | null {
  if (!card || card.isFallback) return null;
  const text = card.changeSummary?.trim();
  if (!text) return null;
  // Seule `changeSummaryDate` date le résumé : `lastModified` bouge à chaque
  // retouche de la fiche, même quand le résumé reste celui d'une veille ancienne.
  // Sans date lisible, rien ne prouve que le résumé parle de cette entrée : on
  // retombe sur le changelog.
  const day = jourISO(card.changeSummaryDate);
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day) || day < entryDate) return null;
  return text;
}

export function selectLatestHeadline(input: LatestHeadlineInput): LatestHeadline {
  const { entryDate, entryType, summary, description, card } = input;
  const fresh = usableChangeSummary(card, entryDate);
  const isCorrection =
    entryType === 'corrected' || (fresh !== null && card?.changeType === 'corrected');

  const raw = fresh !== null ? leadSplit(fresh).headline : (summary?.trim() || description.trim());
  const text = isCorrection ? stripCorrectionPrefix(raw) : raw;

  return {
    text,
    source: fresh !== null ? 'changeSummary' : 'changelog',
    isCorrection,
    cardTitle: card?.title ?? null,
  };
}
