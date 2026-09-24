// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

export type Locale = 'fr' | 'nl' | 'en' | 'de';
export type Confiance = 'official' | 'estimated' | 'unconfirmed';

/**
 * Provenance d'un jeu de données : ce qu'il faut pour qu'un lecteur retrouve chaque chiffre.
 * Tout texte montré au lecteur est donné dans les quatre langues : aucune phrase française dans
 * une légende néerlandaise, anglaise ou allemande. Les notes internes (réserves à vérifier,
 * empreintes des fichiers sources) restent dans le code, jamais dans ces champs.
 */
export interface Provenance {
  /** Nom propre du producteur (texte du lien), sans description ; par langue pour les sigles (IBSA / BISA). */
  producteur: Record<Locale, string>;
  /** URL publique que le lecteur peut ouvrir (pas un point d'accès POST interne). */
  url: string;
  /** Date de mise à jour annoncée par la source, ou null si elle n'en publie pas. */
  sourceMiseAJour: string | null;
  /** Date à laquelle le script a lu la source. */
  extraitLe: string;
  licence: Record<Locale, string>;
  /** Transformations appliquées par BGM (simplification, ratio, rang, arrondi…), même liste dans chaque langue. */
  modifications: Record<Locale, string[]>;
  confiance: Confiance;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const LOCALES: Locale[] = ['fr', 'nl', 'en', 'de'];

export function validerProvenance(p: Provenance): string[] {
  const e: string[] = [];
  for (const l of LOCALES) {
    if (!p.producteur[l]?.trim()) e.push(`producteur (${l}) : requis`);
    if (!p.licence[l]?.trim()) e.push(`licence (${l}) : requise`);
    if (!Array.isArray(p.modifications[l])) e.push(`modifications (${l}) : liste requise`);
    else if (p.modifications[l].length !== p.modifications.fr.length)
      e.push(`modifications (${l}) : ${p.modifications[l].length} entrées au lieu de ${p.modifications.fr.length}`);
    else if (p.modifications[l].some((m) => !m.trim())) e.push(`modifications (${l}) : entrée vide`);
  }
  if (!p.url.startsWith('https://')) e.push('url : https requis');
  if (p.sourceMiseAJour !== null && !ISO.test(p.sourceMiseAJour)) e.push('sourceMiseAJour : date ISO ou null');
  if (!ISO.test(p.extraitLe)) e.push('extraitLe : date ISO AAAA-MM-JJ requise');
  return e;
}

export const LIBELLES_CONFIANCE: Record<Locale, Record<Confiance, string>> = {
  fr: { official: 'officiel', estimated: 'estimé', unconfirmed: 'non confirmé' },
  nl: { official: 'officieel', estimated: 'geschat', unconfirmed: 'niet bevestigd' },
  en: { official: 'official', estimated: 'estimated', unconfirmed: 'unconfirmed' },
  de: { official: 'amtlich', estimated: 'geschätzt', unconfirmed: 'unbestätigt' },
};
