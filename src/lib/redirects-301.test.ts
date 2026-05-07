// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { SLUG_REDIRECTS_301, getRedirectsConfig } from './redirects-301';

describe('SLUG_REDIRECTS_301', () => {
  it('is a readonly array (initially empty)', () => {
    expect(Array.isArray(SLUG_REDIRECTS_301)).toBe(true);
  });

  it('every entry has from and to URL strings starting with /', () => {
    for (const entry of SLUG_REDIRECTS_301) {
      expect(entry.from).toMatch(/^\//);
      expect(entry.to).toMatch(/^\//);
      expect(typeof entry.from).toBe('string');
      expect(typeof entry.to).toBe('string');
    }
  });

  it('no duplicate `from` paths (would create ambiguous redirect)', () => {
    const fromPaths = SLUG_REDIRECTS_301.map((e) => e.from);
    expect(new Set(fromPaths).size).toBe(fromPaths.length);
  });

  it('no entry redirects to itself', () => {
    for (const entry of SLUG_REDIRECTS_301) {
      expect(entry.from).not.toBe(entry.to);
    }
  });
});

describe('getRedirectsConfig', () => {
  it('produces Next.js-compatible redirect entries', () => {
    const config = getRedirectsConfig();
    expect(Array.isArray(config)).toBe(true);
    for (const entry of config) {
      expect(entry).toHaveProperty('source');
      expect(entry).toHaveProperty('destination');
      expect(entry).toHaveProperty('permanent', true);
    }
  });

  it('matches the SLUG_REDIRECTS_301 length', () => {
    expect(getRedirectsConfig().length).toBe(SLUG_REDIRECTS_301.length);
  });
});
