// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Format a date string to a localized short date.
 */
export function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale === 'fr' ? 'fr-BE' : locale === 'nl' ? 'nl-BE' : locale === 'de' ? 'de-DE' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Merge class names, filtering out falsy values.
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Generate a URL-safe slug from text (used for heading IDs and anchor links).
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Chemin d'une URL absolue, pour l'affichage dans un tableau ou une tuile
 * \u00e9troite : une URL compl\u00e8te (https://governance.brussels/fr/dossiers/lez)
 * est ins\u00e9cable et d\u00e9borde sur t\u00e9l\u00e9phone, le chemin seul (/fr/dossiers/lez)
 * tient. Une cha\u00eene d\u00e9j\u00e0 relative (regles.mjs produit des chemins, pas des
 * URL) traverse `new URL()` sans r\u00e9ussir \u00e0 se parser : on la rend telle
 * quelle plut\u00f4t que de planter.
 */
export function chemin(url: string): string {
  try {
    return new URL(url).pathname || url;
  } catch {
    return url;
  }
}
