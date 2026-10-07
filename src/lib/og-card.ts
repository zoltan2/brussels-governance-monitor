// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Image sociale d'une fiche domaine ou d'un dossier : une URL stable.
 *
 * Avant le 07/10/2026, l'URL portait tout le contenu de l'image (titre, date de
 * mise à jour, chiffres clés). Elle changeait donc à chaque veille, et Google
 * découvrait sans fin de nouvelles URL d'image. L'URL ne porte plus que le type
 * et le slug canonique ; la route `[locale]/og` relit la fiche elle-même.
 */

export type OgCardType = 'domain' | 'dossier';

export function isOgCardType(value: string | null): value is OgCardType {
  return value === 'domain' || value === 'dossier';
}

/** Chaîne de requête de l'image d'une fiche, à passer à `buildMetadata({ ogParams })`. */
export function ogCardParams(type: OgCardType, slug: string): string {
  return `type=${type}&slug=${encodeURIComponent(slug)}`;
}

interface OgCardSource {
  title: string;
  lastModified: string;
  confidenceLevel: string;
  status?: string;
  metrics: Array<{ label: string; value: string | number; unit?: string }>;
}

export interface OgCardContent {
  title: string;
  status: string | null;
  date: string;
  confidence: string;
  stats: Array<{ label: string; value: string }>;
}

/** Ce que l'image affiche d'une fiche : les trois premiers chiffres clés au plus. */
export function ogCardContent(card: OgCardSource): OgCardContent {
  return {
    title: card.title,
    status: card.status ?? null,
    date: card.lastModified,
    confidence: card.confidenceLevel,
    stats: card.metrics.slice(0, 3).map((m) => ({
      label: m.label,
      value: `${m.value}${m.unit ? ` ${m.unit}` : ''}`,
    })),
  };
}
