// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// PROTOTYPE LOCAL (branche proto/accueil-refonte).
//
// Les deux jeux quotidiens n'ont pas la même couverture linguistique :
//   Le Stuut du jour (mots)   → français uniquement (html lang="fr", og:locale fr_BE) ;
//   Amai ! (chiffres)         → quatre langues, en URL .html (/nl, /en, /de → 404).
// Vérifié le 16/09/2026. Un seul helper, pour que la page et le pied de page ne
// divergent jamais sur le jeu mis en avant.

export const STUUT_URL = 'https://stuut.governance.brussels';

export const AMAI_URLS: Record<string, string> = {
  fr: 'https://amai.governance.brussels/',
  nl: 'https://amai.governance.brussels/nl.html',
  en: 'https://amai.governance.brussels/en.html',
  de: 'https://amai.governance.brussels/de.html',
};

export interface DailyGame {
  url: string;
  /** Nom propre du jeu, identique dans toutes les langues. */
  name: string;
  /** Accroche courte, en français dans ce prototype. */
  teaser: string;
}

/** Le jeu quotidien mis en avant : le Stuut en français, Amai ! dans les autres langues. */
export function dailyGame(locale: string): DailyGame {
  return locale === 'fr'
    ? { url: STUUT_URL, name: 'Le Stuut du jour', teaser: 'le mot du jour' }
    : { url: AMAI_URLS[locale] ?? AMAI_URLS.en, name: 'Amai !', teaser: 'le chiffre du jour' };
}
