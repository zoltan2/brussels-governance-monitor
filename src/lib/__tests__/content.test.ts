import { describe, it, expect } from 'vitest';
import {
  getDomainCards,
  getDomainCard,
  getAllDomainSlugs,
  getSolutionCards,
  getAllSolutionSlugs,
  getSectorCards,
  getAllSectorSlugs,
  getComparisonCards,
  getAllComparisonSlugs,
  getFormationRounds,
  getFormationEvents,
  getGlossaryTerms,
} from '../content';

// These tests use the real Velite data (built content).
// They verify the content helper functions work correctly with actual data.

describe('getDomainCards', () => {
  it('returns cards for FR locale', () => {
    const cards = getDomainCards('fr');
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach((card) => {
      expect(card.locale).toBe('fr');
      expect(card.title).toBeTruthy();
      expect(card.slug).toBeTruthy();
    });
  });

  it('returns same number of cards for any locale (fallback)', () => {
    const frCards = getDomainCards('fr');
    const nlCards = getDomainCards('nl');
    expect(nlCards.length).toBe(frCards.length);
  });

  it('sorts by status (blocked first, resolved last)', () => {
    const cards = getDomainCards('fr');
    const statusOrder = { blocked: 0, delayed: 1, ongoing: 2, resolved: 3 } as const;
    for (let i = 1; i < cards.length; i++) {
      const prev = statusOrder[cards[i - 1].status as keyof typeof statusOrder];
      const curr = statusOrder[cards[i].status as keyof typeof statusOrder];
      expect(prev).toBeLessThanOrEqual(curr);
    }
  });
});

describe('getDomainCard', () => {
  it('returns a card for an existing slug', () => {
    const slugs = getAllDomainSlugs();
    expect(slugs.length).toBeGreaterThan(0);

    const result = getDomainCard(slugs[0], 'fr');
    expect(result).not.toBeNull();
    expect(result!.card.slug).toBe(slugs[0]);
    expect(result!.isFallback).toBe(false);
  });

  it('returns null for non-existent slug', () => {
    const result = getDomainCard('non-existent-slug-xyz', 'fr');
    expect(result).toBeNull();
  });
});

describe('getAllDomainSlugs', () => {
  it('returns unique slugs', () => {
    const slugs = getAllDomainSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('getSolutionCards', () => {
  it('returns cards for FR locale', () => {
    const cards = getSolutionCards('fr');
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach((card) => {
      expect(card.locale).toBe('fr');
    });
  });

  it('returns same count across locales', () => {
    const frCards = getSolutionCards('fr');
    const nlCards = getSolutionCards('nl');
    expect(nlCards.length).toBe(frCards.length);
  });
});

describe('getAllSolutionSlugs', () => {
  it('returns unique slugs', () => {
    const slugs = getAllSolutionSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('getSectorCards', () => {
  it('returns cards for FR locale', () => {
    const cards = getSectorCards('fr');
    expect(cards.length).toBeGreaterThan(0);
  });
});

describe('getAllSectorSlugs', () => {
  it('returns unique slugs', () => {
    const slugs = getAllSectorSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('getComparisonCards', () => {
  it('returns cards for FR locale', () => {
    const cards = getComparisonCards('fr');
    expect(cards.length).toBeGreaterThan(0);
  });
});

describe('getAllComparisonSlugs', () => {
  it('returns unique slugs', () => {
    const slugs = getAllComparisonSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('getFormationRounds', () => {
  it('returns rounds sorted by number', () => {
    const rounds = getFormationRounds('fr');
    expect(rounds.length).toBeGreaterThan(0);
    for (let i = 1; i < rounds.length; i++) {
      expect(rounds[i].number).toBeGreaterThan(rounds[i - 1].number);
    }
  });
});

describe('getFormationEvents', () => {
  it('returns events sorted by date', () => {
    const events = getFormationEvents('fr');
    expect(events.length).toBeGreaterThan(0);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].date >= events[i - 1].date).toBe(true);
    }
  });
});

describe('getGlossaryTerms', () => {
  it('returns terms for FR locale', () => {
    const terms = getGlossaryTerms('fr');
    expect(terms.length).toBeGreaterThan(0);
    terms.forEach((term) => {
      expect(term.term).toBeTruthy();
      expect(term.definition).toBeTruthy();
    });
  });
});
