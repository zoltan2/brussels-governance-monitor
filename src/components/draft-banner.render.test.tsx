// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import fr from '../../messages/fr.json';
import nl from '../../messages/nl.json';
import en from '../../messages/en.json';
import de from '../../messages/de.json';
import { DraftBanner } from './draft-banner';

afterEach(() => cleanup());

const MESSAGES = { fr, nl, en, de } as const;

function rendre(locale: 'fr' | 'nl' | 'en' | 'de') {
  return render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Europe/Brussels">
      <DraftBanner />
    </NextIntlClientProvider>,
  );
}

describe('DraftBanner', () => {
  it.each([
    ['fr', 'non listée et non indexée'],
    ['nl', 'niet vermeld en niet geïndexeerd'],
    ['en', 'not listed and not indexed'],
    ['de', 'nicht gelistet und nicht indexiert'],
  ] as const)('%s : dit que la page est non listée et non indexée, pas invisible', (locale, fragment) => {
    const { container } = rendre(locale);
    expect(container.textContent).toContain(fragment);
  });

  it("ne prétend plus que la page « n'est pas visible sur le site public » : elle l'est, à son URL", () => {
    const { container } = rendre('fr');
    expect(container.textContent).not.toMatch(/pas visible sur le site public/);
    expect(container.textContent).toMatch(/accessible seulement par son adresse/);
  });
});
