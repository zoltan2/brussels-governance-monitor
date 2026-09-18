// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Les deux jeux quotidiens n'ont pas la même couverture linguistique :
//   Le Stuut du jour (mots)   → français uniquement (html lang="fr", og:locale fr_BE) ;
//   Amai ! (chiffres)         → quatre langues, en URL .html (/nl, /en, /de → 404).
// Vérifié le 16/09/2026. Un seul helper, pour que la page et le pied de page ne
// divergent jamais sur le jeu mis en avant.

export const STUUT_URL = 'https://stuut.governance.brussels';

// Chaque langue vise sa page, jamais la racine : la racine d'Amai est un
// redirecteur qui choisit la langue d'après le stockage local puis le navigateur.
// Un lecteur de /fr au navigateur néerlandophone y recevait Amai en néerlandais
// (relevé par l'équipe design le 18/09/2026). /fr.html répond 200, vérifié le même jour.
export const AMAI_URLS: Record<string, string> = {
  fr: 'https://amai.governance.brussels/fr.html',
  nl: 'https://amai.governance.brussels/nl.html',
  en: 'https://amai.governance.brussels/en.html',
  de: 'https://amai.governance.brussels/de.html',
};

/**
 * Marque un lien vers un jeu autonome partagé DEPUIS BGM (défi, score), pour que la
 * fiche Umami du jeu sache ce que BGM lui amène. Même convention que les liens du
 * Stuut vers BGM (public/assets/utm.mjs du dépôt stuut) : source, medium « jeu »,
 * campagne. Les paramètres se placent AVANT un éventuel fragment (#d=… du défi).
 *
 * ⚠ Pour Amai, viser la page de la langue (AMAI_URLS), jamais la racine : le
 * redirecteur de langue perd la chaîne de requête et ne charge pas Umami.
 */
export function lienJeuDepuisBgm(url: string, campagne: 'defi' | 'partage'): string {
  const coupure = url.indexOf('#');
  const base = coupure === -1 ? url : url.slice(0, coupure);
  const fragment = coupure === -1 ? '' : url.slice(coupure);
  const separateur = base.includes('?') ? '&' : '?';
  return `${base}${separateur}utm_source=bgm&utm_medium=jeu&utm_campaign=${campagne}${fragment}`;
}

/** API d'Amai, lue directement par le jeu natif du panneau (CORS ouvert à governance.brussels). */
export const AMAI_API = 'https://amai.governance.brussels';

export interface DailyGame {
  url: string;
  /** Nom propre du jeu, identique dans toutes les langues. */
  name: string;
}

/** Le jeu quotidien mis en avant : le Stuut en français, Amai ! dans les autres langues. */
export function dailyGame(locale: string): DailyGame {
  return locale === 'fr'
    ? { url: STUUT_URL, name: 'Le Stuut du jour' }
    : { url: AMAI_URLS[locale] ?? AMAI_URLS.en, name: 'Amai !' };
}
