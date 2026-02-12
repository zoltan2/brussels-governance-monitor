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
  summaryFalc?: string;
  draft: boolean;
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
  summaryFalc?: string;
  draft: boolean;
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
  result: 'ongoing' | 'recommendation' | 'stalled' | 'failed' | 'success';
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
    | 'budget'
    | 'initiative'
    | 'agreement';
  confidenceLevel?: 'official' | 'estimated' | 'unconfirmed';
  order?: number;
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

export interface SectorCard {
  title: string;
  slug: string;
  locale: Locale;
  parentDomain: string;
  sector: string;
  frozenMechanisms: Array<{ name: string; description: string; since?: string }>;
  activeMechanisms: Array<{ name: string; description: string }>;
  impactIndicators: Array<{
    label: string;
    value: string;
    source: string;
    url?: string;
    frequency?: string;
  }>;
  stakeholders: Array<{ name: string; type: string; url?: string }>;
  humanImpact?: string;
  draft: boolean;
  lastModified: string;
  content: string;
  permalink: string;
}

export interface ComparisonCard {
  title: string;
  slug: string;
  locale: Locale;
  comparisonType: 'intra-belgian' | 'international';
  entities: Array<{ name: string; code: string }>;
  indicator: string;
  sourceDataset: { name: string; url: string; code?: string };
  methodology: string;
  dataPoints: Array<{ entity: string; value: string; date: string }>;
  caveat?: string;
  draft: boolean;
  lastModified: string;
  content: string;
  permalink: string;
}

export interface Verification {
  slug: string;
  locale: Locale;
  cardType: 'domain' | 'sector';
  cardSlug: string;
  date: string;
  result: 'no-change' | 'change-detected' | 'uncertainty' | 'suspended';
  summary: string;
  trigger?: string;
  sourcesConsulted: Array<{ label: string; url: string; accessedAt: string }>;
  editor: string;
  nextVerification?: string;
  lastModified: string;
  content: string;
  permalink: string;
}

export interface DossierCard {
  title: string;
  slug: string;
  locale: Locale;
  dossierType: 'infrastructure' | 'housing' | 'regulatory' | 'utility' | 'security';
  phase: 'announced' | 'planned' | 'in-progress' | 'stalled' | 'completed' | 'cancelled';
  crisisImpact: 'blocked' | 'delayed' | 'reduced' | 'unaffected';
  blockedSince?: string;
  decisionLevel: 'regional' | 'communal' | 'federal' | 'mixed';
  summary: string;
  estimatedBudget?: string;
  estimatedCostOfInaction?: string;
  stakeholders: string[];
  relatedDomains: string[];
  relatedSectors: string[];
  relatedCommunes: string[];
  relatedFormationEvents: string[];
  sources: Array<{ label: string; url: string; accessedAt: string }>;
  metrics: Array<{ label: string; value: string; unit?: string; source: string; date: string }>;
  alerts: Array<{ label: string; severity: 'info' | 'warning' | 'critical'; date: string }>;
  confidenceLevel: 'official' | 'estimated' | 'unconfirmed';
  dprCommitment?: string;
  lastModified: string;
  draft: boolean;
  content: string;
  permalink: string;
}

export interface CommuneCard {
  title: string;
  slug: string;
  locale: Locale;
  commune: string;
  postalCode: string;
  population: number;
  area?: number;
  mayor: string;
  mayorParty: string;
  coalition: string[];
  councilSeats: number;
  transparencyIndicators: {
    budgetOnline: 'yes' | 'partial' | 'no';
    councilMinutesOnline: 'yes' | 'partial' | 'no';
    councilLivestream: 'yes' | 'partial' | 'no';
    openData: 'yes' | 'partial' | 'no';
    participationPlatform: 'yes' | 'partial' | 'no';
    mandateRegistry: 'yes' | 'partial' | 'no';
  };
  relatedDomains: string[];
  relatedSectors: string[];
  sources: Array<{
    label: string;
    url: string;
    type: 'official' | 'media' | 'opendata' | 'citizen' | 'regional';
    accessedAt: string;
  }>;
  keyFigures: Array<{ label: string; value: string; unit?: string; source: string; date: string }>;
  alerts: Array<{ label: string; severity: 'info' | 'warning' | 'critical'; date: string }>;
  draft: boolean;
  lastModified: string;
  content: string;
  permalink: string;
  transparencyScore: number;
  transparencyTotal: number;
}

interface VeliteCollections {
  domainCards: DomainCard[];
  solutionCards: SolutionCard[];
  formationRounds: FormationRound[];
  formationEvents: FormationEvent[];
  glossaryTerms: GlossaryTerm[];
  verifications: Verification[];
  sectorCards: SectorCard[];
  comparisonCards: ComparisonCard[];
  communeCards: CommuneCard[];
  dossierCards: DossierCard[];
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
      verifications: [],
      sectorCards: [],
      comparisonCards: [],
      communeCards: [],
      dossierCards: [],
    };
  }
}

/**
 * Get all domain cards for a given locale.
 * Per-card fallback: if a card doesn't exist in the requested locale,
 * the FR version is used instead.
 */
const statusOrder: Record<DomainCard['status'], number> = {
  blocked: 0,
  delayed: 1,
  ongoing: 2,
  resolved: 3,
};

export function getDomainCards(locale: Locale): DomainCard[] {
  const { domainCards } = getCollections();
  const frCards = domainCards.filter((c) => c.locale === 'fr' && !c.draft);

  const cards =
    locale === 'fr'
      ? frCards
      : frCards.map((frCard) => {
          const localeCard = domainCards.find(
            (c) => c.slug === frCard.slug && c.locale === locale,
          );
          return localeCard || frCard;
        });

  return cards.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
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
  const frCards = solutionCards.filter((c) => c.locale === 'fr' && !c.draft);
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
  if (latest.result === 'success') return 'agreement';
  if (latest.result === 'ongoing') return 'negotiation';
  return 'exploration';
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

// ──────────────────────────────────────────────
// Sector Cards
// ──────────────────────────────────────────────

/**
 * Get all sector cards for a given locale.
 * Per-card fallback: if a card doesn't exist in the requested locale,
 * the FR version is used instead.
 */
export function getSectorCards(locale: Locale): SectorCard[] {
  const { sectorCards } = getCollections();
  const frCards = sectorCards.filter((c) => c.locale === 'fr' && !c.draft);
  if (locale === 'fr') return frCards;

  return frCards.map((frCard) => {
    const localeCard = sectorCards.find((c) => c.slug === frCard.slug && c.locale === locale);
    return localeCard || frCard;
  });
}

/**
 * Get a single sector card by slug and locale.
 * Falls back to FR version if locale version doesn't exist.
 */
export function getSectorCard(
  slug: string,
  locale: Locale,
): { card: SectorCard; isFallback: boolean } | null {
  const { sectorCards } = getCollections();
  const card = sectorCards.find((c) => c.slug === slug && c.locale === locale);
  if (card) return { card, isFallback: false };

  const fallback = sectorCards.find((c) => c.slug === slug && c.locale === 'fr');
  if (fallback) return { card: fallback, isFallback: true };

  return null;
}

/**
 * Get all sector card slugs (for generateStaticParams).
 */
export function getAllSectorSlugs(): string[] {
  const { sectorCards } = getCollections();
  return [...new Set(sectorCards.map((c) => c.slug))];
}

// ──────────────────────────────────────────────
// Comparison Cards
// ──────────────────────────────────────────────

/**
 * Get all comparison cards for a given locale.
 * Per-card fallback to FR.
 */
export function getComparisonCards(locale: Locale): ComparisonCard[] {
  const { comparisonCards } = getCollections();
  const frCards = comparisonCards.filter((c) => c.locale === 'fr' && !c.draft);
  if (locale === 'fr') return frCards;

  return frCards.map((frCard) => {
    const localeCard = comparisonCards.find(
      (c) => c.slug === frCard.slug && c.locale === locale,
    );
    return localeCard || frCard;
  });
}

/**
 * Get a single comparison card by slug and locale.
 * Falls back to FR version if locale version doesn't exist.
 */
export function getComparisonCard(
  slug: string,
  locale: Locale,
): { card: ComparisonCard; isFallback: boolean } | null {
  const { comparisonCards } = getCollections();
  const card = comparisonCards.find((c) => c.slug === slug && c.locale === locale);
  if (card) return { card, isFallback: false };

  const fallback = comparisonCards.find((c) => c.slug === slug && c.locale === 'fr');
  if (fallback) return { card: fallback, isFallback: true };

  return null;
}

/**
 * Get all comparison card slugs (for generateStaticParams).
 */
export function getAllComparisonSlugs(): string[] {
  const { comparisonCards } = getCollections();
  return [...new Set(comparisonCards.map((c) => c.slug))];
}

// ──────────────────────────────────────────────
// Verifications
// ──────────────────────────────────────────────

/**
 * Get the latest verification for a given card (by cardSlug + cardType).
 * Falls back to FR if locale version doesn't exist.
 */
export function getLatestVerification(
  cardSlug: string,
  cardType: 'domain' | 'sector',
  locale: Locale,
): Verification | null {
  const { verifications } = getCollections();

  const matching = verifications
    .filter((v) => v.cardSlug === cardSlug && v.cardType === cardType && v.locale === locale)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (matching.length > 0) return matching[0];

  // Fallback to FR
  const frMatching = verifications
    .filter((v) => v.cardSlug === cardSlug && v.cardType === cardType && v.locale === 'fr')
    .sort((a, b) => b.date.localeCompare(a.date));

  return frMatching.length > 0 ? frMatching[0] : null;
}

/**
 * Get all verifications for a given card, sorted by date desc.
 */
export function getCardVerifications(
  cardSlug: string,
  cardType: 'domain' | 'sector',
  locale: Locale,
): Verification[] {
  const { verifications } = getCollections();

  const matching = verifications
    .filter((v) => v.cardSlug === cardSlug && v.cardType === cardType && v.locale === locale)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (matching.length > 0) return matching;

  return verifications
    .filter((v) => v.cardSlug === cardSlug && v.cardType === cardType && v.locale === 'fr')
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ──────────────────────────────────────────────
// Aggregated Sources — all sources across all content types
// ──────────────────────────────────────────────

export interface AggregatedSource {
  label: string;
  url: string;
  accessedAt: string;
  contentType: 'domain' | 'solution' | 'sector' | 'comparison' | 'event' | 'glossary';
  contentTitle: string;
}

export function getAllSources(locale: Locale): AggregatedSource[] {
  const sources: AggregatedSource[] = [];

  // Domain cards
  for (const card of getDomainCards(locale)) {
    for (const s of card.sources) {
      sources.push({
        label: s.label,
        url: s.url,
        accessedAt: s.accessedAt,
        contentType: 'domain',
        contentTitle: card.title,
      });
    }
  }

  // Formation events
  for (const event of getFormationEvents(locale)) {
    for (const s of event.sources) {
      sources.push({
        label: s.label,
        url: s.url,
        accessedAt: s.accessedAt,
        contentType: 'event',
        contentTitle: event.title,
      });
    }
  }

  // Glossary terms
  for (const term of getGlossaryTerms(locale)) {
    for (const s of term.sources) {
      sources.push({
        label: s.label,
        url: s.url,
        accessedAt: s.accessedAt,
        contentType: 'glossary',
        contentTitle: term.term,
      });
    }
  }

  // Comparison cards (single sourceDataset per card)
  for (const card of getComparisonCards(locale)) {
    sources.push({
      label: card.sourceDataset.name,
      url: card.sourceDataset.url,
      accessedAt: card.lastModified,
      contentType: 'comparison',
      contentTitle: card.title,
    });
  }

  // Sector cards (impact indicator sources)
  for (const card of getSectorCards(locale)) {
    for (const ind of card.impactIndicators) {
      if (ind.url) {
        sources.push({
          label: ind.source,
          url: ind.url,
          accessedAt: card.lastModified,
          contentType: 'sector',
          contentTitle: card.title,
        });
      }
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return sources.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}

// ──────────────────────────────────────────────
// Draft/Review — returns ALL draft cards for editorial review
// ──────────────────────────────────────────────

export interface DraftItem {
  type: 'domain' | 'solution' | 'sector' | 'comparison';
  title: string;
  slug: string;
  locale: Locale;
  lastModified: string;
  permalink: string;
}

export function getDraftCards(locale: Locale): DraftItem[] {
  const { domainCards, solutionCards, sectorCards, comparisonCards } = getCollections();

  const drafts: DraftItem[] = [];

  for (const card of domainCards) {
    if (card.draft && card.locale === locale) {
      drafts.push({ type: 'domain', title: card.title, slug: card.slug, locale: card.locale, lastModified: card.lastModified, permalink: card.permalink });
    }
  }

  for (const card of solutionCards) {
    if (card.draft && card.locale === locale) {
      drafts.push({ type: 'solution', title: card.title, slug: card.slug, locale: card.locale, lastModified: card.lastModified, permalink: card.permalink });
    }
  }

  for (const card of sectorCards) {
    if (card.draft && card.locale === locale) {
      drafts.push({ type: 'sector', title: card.title, slug: card.slug, locale: card.locale, lastModified: card.lastModified, permalink: card.permalink });
    }
  }

  for (const card of comparisonCards) {
    if (card.draft && card.locale === locale) {
      drafts.push({ type: 'comparison', title: card.title, slug: card.slug, locale: card.locale, lastModified: card.lastModified, permalink: card.permalink });
    }
  }

  return drafts.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
}

// ──────────────────────────────────────────────
// Commune Cards
// ──────────────────────────────────────────────

/**
 * Get all commune cards for a given locale.
 * Per-card fallback: if a card doesn't exist in the requested locale,
 * the FR version is used instead. Sorted by commune name.
 */
export function getCommuneCards(locale: Locale): CommuneCard[] {
  const { communeCards } = getCollections();
  const frCards = communeCards.filter((c) => c.locale === 'fr' && !c.draft);
  if (locale === 'fr') return frCards.sort((a, b) => a.title.localeCompare(b.title, 'fr'));

  return frCards
    .map((frCard) => {
      const localeCard = communeCards.find((c) => c.slug === frCard.slug && c.locale === locale);
      return localeCard || frCard;
    })
    .sort((a, b) => a.title.localeCompare(b.title, locale));
}

/**
 * Get a single commune card by slug and locale.
 * Falls back to FR version if locale version doesn't exist.
 */
export function getCommuneCard(
  slug: string,
  locale: Locale,
): { card: CommuneCard; isFallback: boolean } | null {
  const { communeCards } = getCollections();
  const card = communeCards.find((c) => c.slug === slug && c.locale === locale);
  if (card) return { card, isFallback: false };

  const fallback = communeCards.find((c) => c.slug === slug && c.locale === 'fr');
  if (fallback) return { card: fallback, isFallback: true };

  return null;
}

/**
 * Get all commune card slugs (for generateStaticParams).
 */
export function getAllCommuneSlugs(): string[] {
  const { communeCards } = getCollections();
  return [...new Set(communeCards.map((c) => c.slug))];
}

// ──────────────────────────────────────────────
// Dossier Cards
// ──────────────────────────────────────────────

const crisisImpactOrder: Record<DossierCard['crisisImpact'], number> = {
  blocked: 0,
  delayed: 1,
  reduced: 2,
  unaffected: 3,
};

/**
 * Get all dossier cards for a given locale.
 * Per-card fallback: if a card doesn't exist in the requested locale,
 * the FR version is used instead. Sorted by crisis impact severity.
 */
export function getDossierCards(locale: Locale): DossierCard[] {
  const { dossierCards } = getCollections();
  const frCards = dossierCards.filter((c) => c.locale === 'fr' && !c.draft);
  if (locale === 'fr')
    return frCards.sort((a, b) => crisisImpactOrder[a.crisisImpact] - crisisImpactOrder[b.crisisImpact]);

  return frCards
    .map((frCard) => {
      const localeCard = dossierCards.find((c) => c.slug === frCard.slug && c.locale === locale);
      return localeCard || frCard;
    })
    .sort((a, b) => crisisImpactOrder[a.crisisImpact] - crisisImpactOrder[b.crisisImpact]);
}

/**
 * Get a single dossier card by slug and locale.
 * Falls back to FR version if locale version doesn't exist.
 */
export function getDossierCard(
  slug: string,
  locale: Locale,
): { card: DossierCard; isFallback: boolean } | null {
  const { dossierCards } = getCollections();
  const card = dossierCards.find((c) => c.slug === slug && c.locale === locale);
  if (card) return { card, isFallback: false };

  const fallback = dossierCards.find((c) => c.slug === slug && c.locale === 'fr');
  if (fallback) return { card: fallback, isFallback: true };

  return null;
}

/**
 * Get all dossier card slugs (for generateStaticParams).
 */
export function getAllDossierSlugs(): string[] {
  const { dossierCards } = getCollections();
  return [...new Set(dossierCards.map((c) => c.slug))];
}
