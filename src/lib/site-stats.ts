// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Les chiffres que le site annonce sur lui-même : pages, sources, langues.
 *
 * Avant le 24/09/2026, le bloc de soutien de l'accueil affichait
 * « 528 pages · 323 sources · 4 langues » écrit en dur depuis mars, pendant que
 * le bloc « Ce qu'on surveille », trois sections plus haut, lisait 245 sources
 * dans le registre. 323 était le total du registre au 07/03/2026 (veille
 * éditoriale ET scan mensuel du radar, sources désactivées comprises) ; 528 ne
 * se retrouve dans aucune donnée versionnée (le plan du site de ce commit donne
 * 499 URL).
 *
 * Ce module ne calcule rien lui-même : il REPREND les comptes existants, pour
 * qu'il n'y ait jamais deux vérités concurrentes.
 *   - sources : `getEditorialSourceCount`, le même compte que « Veille active :
 *     N sources suivies » sur l'accueil et que la page Méthodologie ;
 *   - pages : les URL du plan du site (`sitemap.ts`), c'est-à-dire les pages
 *     publiques et indexables, toutes langues confondues ;
 *   - langues : les locales du routage.
 */

import sitemap from '@/app/sitemap';
import { routing } from '@/i18n/routing';
import { getEditorialSourceCount } from '@/lib/radar';

export interface SiteStats {
  /** Pages publiques déclarées au plan du site, toutes langues confondues. */
  pages: number;
  /** Sources suivies par la veille éditoriale (hors scan mensuel, hors désactivées). */
  sourcesSuivies: number;
  /** Langues du site. */
  langues: number;
}

/** Sources suivies par la veille : le compte affiché dans « Ce qu'on surveille ». */
export function getSourcesSuivies(): number {
  return getEditorialSourceCount();
}

export function getNombreDeLangues(): number {
  return routing.locales.length;
}

export function getNombreDePages(): number {
  return sitemap().length;
}

export function getSiteStats(): SiteStats {
  return {
    pages: getNombreDePages(),
    sourcesSuivies: getSourcesSuivies(),
    langues: getNombreDeLangues(),
  };
}
