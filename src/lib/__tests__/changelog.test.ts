// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { isFilterableSection, resolveCardTitle, FILTERABLE_SECTIONS } from '../changelog';
import { getAllDomainSlugs } from '../content';

// These tests require Velite build output (.velite/ directory), same convention
// as src/lib/__tests__/content.test.ts.
let hasVeliteData = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../../../.velite');
  hasVeliteData = true;
} catch {
  // Velite data not available
}

const describeWithData = hasVeliteData ? describe : describe.skip;

describe('isFilterableSection', () => {
  it('accepts all 6 filterable section values', () => {
    for (const section of FILTERABLE_SECTIONS) {
      expect(isFilterableSection(section)).toBe(true);
    }
  });

  it('rejects sections that have no card getter', () => {
    expect(isFilterableSection('timeline')).toBe(false);
    expect(isFilterableSection('glossary')).toBe(false);
    expect(isFilterableSection('site')).toBe(false);
  });

  it('rejects undefined, empty string, and unknown strings', () => {
    expect(isFilterableSection(undefined)).toBe(false);
    expect(isFilterableSection('')).toBe(false);
    expect(isFilterableSection('bogus')).toBe(false);
  });
});

describeWithData('resolveCardTitle', () => {
  it('resolves a real domain card title', () => {
    const slugs = getAllDomainSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    const title = resolveCardTitle('domains', slugs[0], 'fr');
    expect(title).toBeTruthy();
  });

  it('resolves the same slug independently across two colliding sections', () => {
    // Empirical collision confirmed 2026-07-23: 'education' is a real slug in
    // BOTH content/domain-cards/ and content/sector-cards/. This is the exact
    // case the slug+section filter (not slug alone) exists to handle correctly.
    const domainTitle = resolveCardTitle('domains', 'education', 'fr');
    const sectorTitle = resolveCardTitle('sectors', 'education', 'fr');
    expect(domainTitle).toBeTruthy();
    expect(sectorTitle).toBeTruthy();
  });

  it('returns null for a slug that does not exist in the given section', () => {
    const title = resolveCardTitle('domains', 'this-slug-does-not-exist-anywhere-xyz', 'fr');
    expect(title).toBeNull();
  });
});
