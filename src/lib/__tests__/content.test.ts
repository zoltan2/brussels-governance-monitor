// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

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

// These tests require Velite build output (.velite/ directory).
// Run `npm run build` first to generate it, or they will be skipped.
let hasVeliteData = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../../.velite');
  hasVeliteData = true;
} catch {
  // Velite data not available
}

const describeWithData = hasVeliteData ? describe : describe.skip;

describeWithData('getDomainCards', () => {
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

describeWithData('getDomainCard', () => {
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

describeWithData('getAllDomainSlugs', () => {
  it('returns unique slugs', () => {
    const slugs = getAllDomainSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describeWithData('getSolutionCards', () => {
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

describeWithData('getAllSolutionSlugs', () => {
  it('returns unique slugs', () => {
    const slugs = getAllSolutionSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describeWithData('getSectorCards', () => {
  it('returns cards for FR locale', () => {
    const cards = getSectorCards('fr');
    expect(cards.length).toBeGreaterThan(0);
  });
});

describeWithData('getAllSectorSlugs', () => {
  it('returns unique slugs', () => {
    const slugs = getAllSectorSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describeWithData('getComparisonCards', () => {
  it('returns cards for FR locale', () => {
    const cards = getComparisonCards('fr');
    expect(cards.length).toBeGreaterThan(0);
  });
});

describeWithData('getAllComparisonSlugs', () => {
  it('returns unique slugs', () => {
    const slugs = getAllComparisonSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describeWithData('getFormationRounds', () => {
  it('returns rounds sorted by number', () => {
    const rounds = getFormationRounds('fr');
    expect(rounds.length).toBeGreaterThan(0);
    for (let i = 1; i < rounds.length; i++) {
      expect(rounds[i].number).toBeGreaterThan(rounds[i - 1].number);
    }
  });
});

describeWithData('getFormationEvents', () => {
  it('returns events sorted by date', () => {
    const events = getFormationEvents('fr');
    expect(events.length).toBeGreaterThan(0);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].date >= events[i - 1].date).toBe(true);
    }
  });
});

describeWithData('getGlossaryTerms', () => {
  it('returns terms for FR locale', () => {
    const terms = getGlossaryTerms('fr');
    expect(terms.length).toBeGreaterThan(0);
    terms.forEach((term) => {
      expect(term.term).toBeTruthy();
      expect(term.definition).toBeTruthy();
    });
  });
});
