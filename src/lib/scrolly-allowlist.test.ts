// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { isScrollyEnabled, SCROLLY_ENABLED_DOSSIERS } from './scrolly-allowlist';

describe('scrolly-allowlist', () => {
  it('contains cpas-bruxellois', () => {
    expect(SCROLLY_ENABLED_DOSSIERS.has('cpas-bruxellois')).toBe(true);
  });

  it('does not contain other current dossiers', () => {
    expect(SCROLLY_ENABLED_DOSSIERS.has('bim-bruxelles')).toBe(false);
    expect(SCROLLY_ENABLED_DOSSIERS.has('acs')).toBe(false);
    expect(SCROLLY_ENABLED_DOSSIERS.has('seniors')).toBe(false);
  });

  it('isScrollyEnabled returns true for cpas-bruxellois', () => {
    expect(isScrollyEnabled('cpas-bruxellois')).toBe(true);
  });

  it('isScrollyEnabled returns false for non-allowlisted slugs', () => {
    expect(isScrollyEnabled('bim-bruxelles')).toBe(false);
    expect(isScrollyEnabled('foo-bar')).toBe(false);
  });

  it('isScrollyEnabled handles edge cases defensively', () => {
    expect(isScrollyEnabled('')).toBe(false);
    expect(isScrollyEnabled(null)).toBe(false);
    expect(isScrollyEnabled(undefined)).toBe(false);
    // @ts-expect-error -- defensive runtime check on number
    expect(isScrollyEnabled(42)).toBe(false);
    // @ts-expect-error -- defensive runtime check on object
    expect(isScrollyEnabled({})).toBe(false);
  });

  it('SCROLLY_ENABLED_DOSSIERS is a Set instance', () => {
    expect(SCROLLY_ENABLED_DOSSIERS).toBeInstanceOf(Set);
  });
});
