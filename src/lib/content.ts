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

export interface FormationRound {
  number: number;
  label: string;
  slug: string;
  locale: Locale;
  actor: string;
  startDate: string;
  endDate?: string;
  formulaAttempted: string;
  result: 'ongoing' | 'recommendation' | 'stalled' | 'failed';
  failureReason?: string;
  lastModified: string;
  content: string;
  permalink: string;
}

export interface FormationEvent {
  title: string;
  slug: string;
  locale: Locale;
  date: string;
  round: number;
  eventType:
    | 'designation'
    | 'consultation'
    | 'proposal'
    | 'blockage'
    | 'resignation'
    | 'citizen'
    | 'budget';
  summary: string;
  impact?: string;
  sources: Array<{ label: string; url: string; accessedAt: string }>;
  lastModified: string;
  content: string;
  permalink: string;
}

export interface GlossaryTerm {
  term: string;
  slug: string;
  locale: Locale;
  definition: string;
  category: 'institution' | 'procedure' | 'budget' | 'political' | 'legal' | 'bgm';
  relatedTerms: string[];
  sources: Array<{ label: string; url: string; accessedAt: string }>;
  lastModified: string;
  content: string;
  permalink: string;
}

interface VeliteCollections {
  domainCards: DomainCard[];
  solutionCards: SolutionCard[];
  formationRounds: FormationRound[];
  formationEvents: FormationEvent[];
  glossaryTerms: GlossaryTerm[];
}

function getCollections(): VeliteCollections {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../../.velite') as unknown as VeliteCollections;
  } catch {
    return {
      domainCards: [],
      solutionCards: [],
      formationRounds: [],
      formationEvents: [],
      glossaryTerms: [],
    };
  }
}

/**
 * Get all domain cards for a given locale.
 * Per-card fallback: if a card doesn't exist in the requested locale,
 * the FR version is used instead.
 */
export function getDomainCards(locale: Locale): DomainCard[] {
  const { domainCards } = getCollections();
  const frCards = domainCards.filter((c) => c.locale === 'fr');
  if (locale === 'fr') return frCards;

  return frCards.map((frCard) => {
    const localeCard = domainCards.find((c) => c.slug === frCard.slug && c.locale === locale);
    return localeCard || frCard;
  });
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
 * Per-card fallback: if a card doesn't exist in the requested locale,
 * the FR version is used instead.
 */
export function getSolutionCards(locale: Locale): SolutionCard[] {
  const { solutionCards } = getCollections();
  const frCards = solutionCards.filter((c) => c.locale === 'fr');
  if (locale === 'fr') return frCards;

  return frCards.map((frCard) => {
    const localeCard = solutionCards.find((c) => c.slug === frCard.slug && c.locale === locale);
    return localeCard || frCard;
  });
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

// ──────────────────────────────────────────────
// Formation Rounds & Events
// ──────────────────────────────────────────────

/**
 * Get all formation rounds for a locale, sorted by number.
 * Falls back to FR if locale version doesn't exist.
 */
export function getFormationRounds(locale: Locale): FormationRound[] {
  const { formationRounds } = getCollections();
  const frRounds = formationRounds
    .filter((r) => r.locale === 'fr')
    .sort((a, b) => a.number - b.number);
  if (locale === 'fr') return frRounds;

  return frRounds.map((frRound) => {
    const localeRound = formationRounds.find(
      (r) => r.number === frRound.number && r.locale === locale,
    );
    return localeRound || frRound;
  });
}

/**
 * Get all formation events for a locale, sorted by date.
 * Falls back to FR if locale version doesn't exist.
 */
export function getFormationEvents(locale: Locale): FormationEvent[] {
  const { formationEvents } = getCollections();
  const frEvents = formationEvents
    .filter((e) => e.locale === 'fr')
    .sort((a, b) => a.date.localeCompare(b.date));
  if (locale === 'fr') return frEvents;

  return frEvents.map((frEvent) => {
    const localeEvent = formationEvents.find(
      (e) => e.slug === frEvent.slug && e.locale === locale,
    );
    return localeEvent || frEvent;
  });
}

/**
 * Get the current (latest) formation round.
 */
export function getCurrentRound(locale: Locale): FormationRound | null {
  const rounds = getFormationRounds(locale);
  return rounds.length > 0 ? rounds[rounds.length - 1] : null;
}

/**
 * Get the current formation phase based on the latest round's result.
 */
export function getCurrentPhase(): 'exploration' | 'negotiation' | 'agreement' | 'government' {
  const { formationRounds } = getCollections();
  const frRounds = formationRounds.filter((r) => r.locale === 'fr');
  if (frRounds.length === 0) return 'exploration';

  const latest = frRounds.sort((a, b) => b.number - a.number)[0];
  if (latest.result === 'ongoing') return 'exploration';
  return 'exploration'; // Until a round reaches negotiation/agreement
}

// ──────────────────────────────────────────────
// Glossary
// ──────────────────────────────────────────────

/**
 * Get all glossary terms for a locale, sorted alphabetically.
 * Falls back to FR if locale version doesn't exist.
 */
export function getGlossaryTerms(locale: Locale): GlossaryTerm[] {
  const { glossaryTerms } = getCollections();
  const frTerms = glossaryTerms
    .filter((t) => t.locale === 'fr')
    .sort((a, b) => a.term.localeCompare(b.term, 'fr'));
  if (locale === 'fr') return frTerms;

  return frTerms.map((frTerm) => {
    const localeTerm = glossaryTerms.find(
      (t) => t.slug === frTerm.slug && t.locale === locale,
    );
    return localeTerm || frTerm;
  });
}

/**
 * Get a single glossary term by slug.
 */
export function getGlossaryTerm(
  slug: string,
  locale: Locale,
): { term: GlossaryTerm; isFallback: boolean } | null {
  const { glossaryTerms } = getCollections();
  const term = glossaryTerms.find((t) => t.slug === slug && t.locale === locale);
  if (term) return { term, isFallback: false };

  const fallback = glossaryTerms.find((t) => t.slug === slug && t.locale === 'fr');
  if (fallback) return { term: fallback, isFallback: true };

  return null;
}
