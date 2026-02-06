import type { Locale } from '@/i18n/routing';

export interface DomainCard {
  title: string;
  slug: string;
  locale: Locale;
  domain: string;
  status: 'blocked' | 'delayed' | 'ongoing' | 'resolved';
  blockedSince?: string;
  summary: string;
  sectors: string[];
  sources: Array<{ label: string; url: string; accessedAt: string }>;
  confidenceLevel: 'official' | 'estimated' | 'unconfirmed';
  metrics: Array<{ label: string; value: string; unit?: string; source: string; date: string }>;
  lastModified: string;
  changeType?: string;
  changeSummary?: string;
  content: string;
  permalink: string;
}

export interface SolutionCard {
  title: string;
  slug: string;
  locale: Locale;
  solutionType: 'political' | 'constitutional' | 'parliamentary';
  feasibility: 'high' | 'medium' | 'low' | 'very-low' | 'near-zero';
  timeline: 'immediate' | 'weeks' | 'months' | 'years';
  precedent?: { description: string; country: string; year: number };
  legalBasis?: string;
  mechanism: string;
  risks: string[];
  whoCanTrigger: string;
  lastModified: string;
  content: string;
  permalink: string;
}

interface VeliteCollections {
  domainCards: DomainCard[];
  solutionCards: SolutionCard[];
}

function getCollections(): VeliteCollections {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../../.velite') as unknown as VeliteCollections;
  } catch {
    return { domainCards: [], solutionCards: [] };
  }
}

/**
 * Get all domain cards for a given locale.
 * Falls back to FR if no card exists in the requested locale.
 */
export function getDomainCards(locale: Locale): DomainCard[] {
  const { domainCards } = getCollections();
  const localeCards = domainCards.filter((c) => c.locale === locale);

  if (localeCards.length > 0) return localeCards;

  // Fallback to FR
  return domainCards.filter((c) => c.locale === 'fr');
}

/**
 * Get a single domain card by slug and locale.
 * Falls back to FR version if locale version doesn't exist.
 */
export function getDomainCard(
  slug: string,
  locale: Locale,
): { card: DomainCard; isFallback: boolean } | null {
  const { domainCards } = getCollections();
  const card = domainCards.find((c) => c.slug === slug && c.locale === locale);
  if (card) return { card, isFallback: false };

  const fallback = domainCards.find((c) => c.slug === slug && c.locale === 'fr');
  if (fallback) return { card: fallback, isFallback: true };

  return null;
}

/**
 * Get all solution cards for a given locale.
 * Falls back to FR if no card exists in the requested locale.
 */
export function getSolutionCards(locale: Locale): SolutionCard[] {
  const { solutionCards } = getCollections();
  const localeCards = solutionCards.filter((c) => c.locale === locale);

  if (localeCards.length > 0) return localeCards;

  return solutionCards.filter((c) => c.locale === 'fr');
}

/**
 * Get a single solution card by slug and locale.
 * Falls back to FR version if locale version doesn't exist.
 */
export function getSolutionCard(
  slug: string,
  locale: Locale,
): { card: SolutionCard; isFallback: boolean } | null {
  const { solutionCards } = getCollections();
  const card = solutionCards.find((c) => c.slug === slug && c.locale === locale);
  if (card) return { card, isFallback: false };

  const fallback = solutionCards.find((c) => c.slug === slug && c.locale === 'fr');
  if (fallback) return { card: fallback, isFallback: true };

  return null;
}

/**
 * Get all domain card slugs (for generateStaticParams).
 */
export function getAllDomainSlugs(): string[] {
  const { domainCards } = getCollections();
  return [...new Set(domainCards.map((c) => c.slug))];
}

/**
 * Get all solution card slugs (for generateStaticParams).
 */
export function getAllSolutionSlugs(): string[] {
  const { solutionCards } = getCollections();
  return [...new Set(solutionCards.map((c) => c.slug))];
}
