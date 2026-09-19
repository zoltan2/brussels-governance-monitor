// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { isIndexableDigestEdition } from './content';

describe('isIndexableDigestEdition', () => {
  it('indexes the native edition of the four site languages', () => {
    for (const lang of ['fr', 'nl', 'en', 'de']) {
      expect(isIndexableDigestEdition({ entry: { lang }, isFallback: false })).toBe(true);
    }
  });

  it('keeps the French text served under another language URL out of the index', () => {
    expect(isIndexableDigestEdition({ entry: { lang: 'fr' }, isFallback: true })).toBe(false);
  });

  it('keeps editions beyond the site languages out of the index', () => {
    for (const lang of ['ar', 'es', 'pl', 'pt', 'ro', 'sw', 'tr']) {
      expect(isIndexableDigestEdition({ entry: { lang }, isFallback: false })).toBe(false);
    }
  });
});
