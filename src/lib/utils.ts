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
