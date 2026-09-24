// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup, fireEvent } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import fr from '../../messages/fr.json';
import nl from '../../messages/nl.json';
import { VerifiedBadge } from './verified-badge';
import { FreshnessBadge } from './freshness-badge';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

afterEach(() => cleanup());

const MESSAGES = { fr, nl } as const;

function rendre(locale: 'fr' | 'nl', lastVerified: string | undefined) {
  return render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Europe/Brussels">
      <FreshnessBadge lastModified="2026-09-10" locale={locale} />
      <VerifiedBadge lastVerified={lastVerified} locale={locale} />
    </NextIntlClientProvider>,
  );
}

describe('VerifiedBadge', () => {
  it('affiche « Vérifié le » et la date en français, avec un <time> machine-lisible', () => {
    const { container } = rendre('fr', '2026-09-20');
    expect(container.textContent).toContain('Vérifié le 20 septembre 2026');
    expect(container.querySelector('time[datetime="2026-09-20"]')).not.toBeNull();
  });

  it('affiche « Gecontroleerd op » en néerlandais', () => {
    const { container } = rendre('nl', '2026-09-20');
    expect(container.textContent).toContain('Gecontroleerd op 20 september 2026');
  });

  it('ne rend rien sans lastVerified : jamais une date inventée, et la date de mise à jour reste', () => {
    const { container } = rendre('fr', undefined);
    expect(container.textContent).not.toMatch(/Vérifié le/);
    expect(container.querySelector('time[datetime="2026-09-10"]')).not.toBeNull();
  });

  it('ne rend rien pour une date illisible (Velite ne bloque pas le schéma)', () => {
    const { container } = rendre('fr', '20/09/2026');
    expect(container.textContent).not.toMatch(/Vérifié le/);
  });

  it('accepte un horodatage Velite et le ramène à son jour', () => {
    const { container } = rendre('fr', '2026-09-20T00:00:00.000Z');
    expect(container.querySelector('time[datetime="2026-09-20"]')).not.toBeNull();
  });

  it('ne dit plus « Vérifié récemment » pour une simple mise à jour du texte', () => {
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={fr} timeZone="Europe/Brussels">
        <FreshnessBadge lastModified={new Date().toISOString()} locale="fr" />
      </NextIntlClientProvider>,
    );
    expect(container.textContent).toContain('Mis à jour récemment');
    expect(container.textContent).not.toContain('Vérifié');
  });

  it.each([
    ['fr', 'Que signifie « vérifié » ?', /que le texte ait changé ou non/],
    ['nl', 'Wat betekent „gecontroleerd”?', /of de tekst nu veranderd is of niet/],
  ] as const)('%s : explication en divulgation native, ouverte puis refermée par son summary', (locale, nom, texte) => {
    const { container } = rendre(locale, '2026-09-20');
    const details = container.querySelector('details');
    const summary = container.querySelector('summary');
    expect(details).not.toBeNull();
    expect(summary).not.toBeNull();
    // Aucun ARIA ajouté : ni role="tooltip", ni aria-expanded écrit à la main.
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    expect(container.querySelector('[aria-expanded]')).toBeNull();
    // Nom accessible complet, « ? » visible décoratif.
    expect(summary!.textContent).toContain(nom);
    expect(summary!.querySelector('[aria-hidden="true"]')?.textContent).toBe('?');
    expect(details!.textContent).toMatch(texte);

    expect(details!.open).toBe(false);
    fireEvent.click(summary!);
    expect(details!.open).toBe(true);
    fireEvent.click(summary!);
    expect(details!.open).toBe(false);
  });

  it('fonctionne sans JavaScript : le HTML serveur porte déjà le <details> et son texte', () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="fr" messages={fr} timeZone="Europe/Brussels">
        <VerifiedBadge lastVerified="2026-09-20" locale="fr" />
      </NextIntlClientProvider>,
    );
    expect(html).toMatch(/^<div[^>]*>/);
    expect(html).toContain('<details');
    expect(html).toContain('<summary');
    expect(html).toContain('que le texte ait changé ou non');
    expect(html).not.toContain('role="tooltip"');
  });

  it('ne présente aucune violation axe, fermé comme ouvert', async () => {
    const { container } = rendre('fr', '2026-09-20');
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(container.querySelector('summary')!);
    expect(container.querySelector('details')!.open).toBe(true);
    expect(await axe(container)).toHaveNoViolations();
  });
});
