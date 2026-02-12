/**
 * Days between Brussels elections (9 June 2024) and government agreement (12 February 2026).
 * Frozen at 613 — the counter no longer ticks.
 */
export function daysSinceElections(): number {
  return 613;
}

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
