// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it, vi } from 'vitest';

// metadata.ts resolves localized paths through next-intl, which pulls next/navigation
// and cannot load under vitest. truncateDescription does not touch it.
vi.mock('@/i18n/navigation', () => ({ getPathname: () => '/' }));

import { buildMetadata, dossierSearchMeta, truncateDescription } from './metadata';

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

describe('dossierSearchMeta', () => {
  const card = {
    title: 'Zone de basses émissions : calendrier, dérogations et amendes à Bruxelles en 2026',
    summary: 'La LEZ bruxelloise interdit depuis janvier 2026 les diesels Euro 5.',
  };

  it('keeps the dossier title and summary when no seo fields exist', () => {
    expect(dossierSearchMeta(card)).toEqual({
      title: card.title,
      absoluteTitle: false,
      description: card.summary,
    });
  });

  it('uses seoTitle as an absolute title and seoDescription as description', () => {
    expect(
      dossierSearchMeta({
        ...card,
        seoTitle: 'LEZ Bruxelles 2026 : calendrier et amendes',
        seoDescription: 'Ce qui est interdit, depuis quand, et ce que coûte une infraction.',
      }),
    ).toEqual({
      title: 'LEZ Bruxelles 2026 : calendrier et amendes',
      absoluteTitle: true,
      description: 'Ce qui est interdit, depuis quand, et ce que coûte une infraction.',
    });
  });

  it('takes each field on its own: seoTitle alone keeps the summary', () => {
    const out = dossierSearchMeta({ ...card, seoTitle: 'LEZ Bruxelles 2026' });
    expect(out.description).toBe(card.summary);
    expect(out.absoluteTitle).toBe(true);
  });

  it('ignores a blank seoTitle rather than printing an empty title', () => {
    expect(dossierSearchMeta({ ...card, seoTitle: '  ' }).title).toBe(card.title);
  });
});

describe('buildMetadata title', () => {
  it('lets the layout template add its suffix by default', () => {
    const meta = buildMetadata({ locale: 'fr', title: 'LEZ', description: 'x' });
    expect(meta.title).toBe('LEZ');
  });

  it('emits an absolute title when asked, and the same title for OpenGraph and Twitter', () => {
    const meta = buildMetadata({ locale: 'fr', title: 'LEZ Bruxelles 2026', description: 'x', absoluteTitle: true });
    expect(meta.title).toEqual({ absolute: 'LEZ Bruxelles 2026' });
    expect(meta.openGraph?.title).toBe('LEZ Bruxelles 2026');
    expect(meta.twitter?.title).toBe('LEZ Bruxelles 2026');
  });
});
