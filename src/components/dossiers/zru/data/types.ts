// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

export type Locale = 'fr' | 'nl' | 'en' | 'de';
export type Confiance = 'official' | 'estimated' | 'unconfirmed';

/** Provenance d'un jeu de données : ce qu'il faut pour qu'un lecteur retrouve chaque chiffre. */
export interface Provenance {
  producteur: string;
  /** URL publique que le lecteur peut ouvrir (pas un point d'accès POST interne). */
  url: string;
  /** Date de mise à jour annoncée par la source, ou null si elle n'en publie pas. */
  sourceMiseAJour: string | null;
  /** Date à laquelle le script a lu la source. */
  extraitLe: string;
  licence: string;
  /** Transformations appliquées par BGM (simplification, ratio, rang, arrondi…). */
  modifications: string[];
  confiance: Confiance;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validerProvenance(p: Provenance): string[] {
  const e: string[] = [];
  if (!p.producteur.trim()) e.push('producteur : requis');
  if (!p.url.startsWith('https://')) e.push('url : https requis');
  if (p.sourceMiseAJour !== null && !ISO.test(p.sourceMiseAJour)) e.push('sourceMiseAJour : date ISO ou null');
  if (!ISO.test(p.extraitLe)) e.push('extraitLe : date ISO AAAA-MM-JJ requise');
  if (!p.licence.trim()) e.push('licence : requise');
  return e;
}

export const LIBELLES_CONFIANCE: Record<Locale, Record<Confiance, string>> = {
  fr: { official: 'officiel', estimated: 'estimé', unconfirmed: 'non confirmé' },
  nl: { official: 'officieel', estimated: 'geschat', unconfirmed: 'niet bevestigd' },
  en: { official: 'official', estimated: 'estimated', unconfirmed: 'unconfirmed' },
  de: { official: 'amtlich', estimated: 'geschätzt', unconfirmed: 'unbestätigt' },
};
