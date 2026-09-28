// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Bloc « Signaux en cours de vérification » de la page d'accueil : quels signaux
 * du radar il montre, et avec quel texte.
 *
 * Sortie de `src/app/[locale]/page.tsx` le 28/09/2026 pour être testable : le
 * filtre vivait en ligne dans la page, sans test, et l'accueil est resté figé au
 * 24/09 pendant quatre jours parce que les veilles posaient `confirmed` sur des
 * signaux encore suivis (seuls les `active` s'affichent). Invariants gardés par
 * `homepage-signals.test.ts` et `radar-accueil-invariants.test.ts`.
 */
import { leadSplit } from './lead-split';

export interface HomepageSignalInput {
  id: string;
  date: string;
  status: 'active' | 'confirmed' | 'archived';
  cards: string[];
  summary?: string;
  description: string;
}

export const HOMEPAGE_SIGNAL_COUNT = 3;

/**
 * Les signaux actifs les plus récents (date décroissante, ordre du fichier à date
 * égale), hors ceux qui portent sur une fiche déjà mise en avant par la barre
 * « Dernière mise à jour » (`excludedCardSlugs`), pour ne pas répéter le même
 * sujet deux fois en haut de page.
 */
export function selectHomepageSignals<T extends HomepageSignalInput>(
  signals: readonly T[],
  excludedCardSlugs: ReadonlySet<string>,
  limit = HOMEPAGE_SIGNAL_COUNT,
): T[] {
  return signals
    .map((signal, index) => ({ signal, index }))
    .filter(({ signal }) => signal.status === 'active')
    .filter(({ signal }) => !signal.cards.some((card) => excludedCardSlugs.has(card)))
    .sort((a, b) => b.signal.date.localeCompare(a.signal.date) || a.index - b.index)
    .slice(0, limit)
    .map(({ signal }) => signal);
}

/** Largeur maximale du texte d'un signal sur l'accueil (cible éditoriale : ~150). */
export const HOMEPAGE_SIGNAL_MAX_CHARS = 180;

/** Sous ce seuil, une « première phrase » est un fragment (« Hub. », « Am 14. »). */
const MIN_BLURB_CHARS = 40;

function couperAuPlafond(texte: string): string {
  if (texte.length <= HOMEPAGE_SIGNAL_MAX_CHARS) return texte;
  return texte.slice(0, HOMEPAGE_SIGNAL_MAX_CHARS).trimEnd() + '…';
}

/**
 * Texte d'un signal : son `summary` s'il existe, sinon la première phrase de la
 * description. Le repli passait par `/^[^.!?]+[.!?]/`, qui coupe au premier point
 * et donnait « Hub. » (hub.brussels) ou « Am 14. » (date allemande). Il passe
 * désormais par `leadSplit`, avec un plancher : une première phrase trop courte
 * cède la place à la description coupée au plafond. Le plafond s'applique aux deux
 * branches (des résumés dépassent 180 caractères).
 */
export function getHomepageBlurb(summary: string | undefined, description: string): string {
  if (summary) return couperAuPlafond(summary);
  const { headline } = leadSplit(description);
  const phrase = headline.endsWith('…') ? '' : headline;
  return couperAuPlafond(phrase.length >= MIN_BLURB_CHARS ? phrase : description.trim());
}
