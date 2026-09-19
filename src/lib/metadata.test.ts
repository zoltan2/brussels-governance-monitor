// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it, vi } from 'vitest';

// metadata.ts resolves localized paths through next-intl, which pulls next/navigation
// and cannot load under vitest. truncateDescription does not touch it.
vi.mock('@/i18n/navigation', () => ({ getPathname: () => '/' }));

import { truncateDescription } from './metadata';

describe('truncateDescription', () => {
  it('leaves a short description untouched', () => {
    expect(truncateDescription('La LEZ en bref.')).toBe('La LEZ en bref.');
  });

  it('never exceeds 160 characters and never cuts a word', () => {
    const text =
      "La LEZ interdit depuis le 1er janvier 2026 les diesels Euro 5 et les essences Euro 2, et les amendes de 350 EUR s'appliquent depuis le 1er juillet 2026 dans toute la Région";
    const out = truncateDescription(text);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith('…')).toBe(true);
    const kept = out.slice(0, -1);
    expect(text.startsWith(kept)).toBe(true);
    expect(text[kept.length]).toBe(' ');
  });

  it('prefers ending on a full sentence when one closes late enough', () => {
    const first =
      'Environ dix mille postes ACS existent à Bruxelles, dont 6 700 occupés, pour un budget de 276 millions en 2026.';
    const out = truncateDescription(`${first} La réforme annoncée en février reste sans texte adopté à ce jour.`);
    expect(out).toBe(first);
  });

  it('does not end on dangling punctuation before the ellipsis', () => {
    const text = `${'mot '.repeat(38)}fin, suite de la phrase qui dépasse largement la limite`;
    expect(truncateDescription(text)).not.toMatch(/[,;:]…$/);
  });
});
