// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import fr from '../../messages/fr.json';
import nl from '../../messages/nl.json';
import type { Verification } from '@/lib/content';
import { VerificationBadge } from './verification-badge';

// Voir games-panel.render.test.tsx : createNavigation importe `next/navigation` en ESM,
// irrésolvable hors bundle Next.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}));

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

afterEach(() => cleanup());

const MESSAGES = { fr, nl } as const;

// Aujourd'hui figé pour les tests : jamais l'horloge réelle.
const AUJOURDHUI = '2026-09-24';

function verification(overrides: Partial<Verification> = {}): Verification {
  return {
    slug: 'budget-2026-04-06',
    locale: 'fr',
    cardType: 'domain',
    cardSlug: 'budget',
    date: '2026-04-06',
    result: 'no-change',
    summary: 'Résumé de test.',
    sourcesConsulted: [],
    editor: 'Équipe BGM',
    nextVerification: '2026-04-06',
    lastModified: '2026-04-06',
    content: '',
    permalink: '/verifications/budget-2026-04-06',
    ...overrides,
  };
}

function rendre(locale: 'fr' | 'nl', v: Verification, today: string = AUJOURDHUI) {
  return render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Europe/Brussels">
      <VerificationBadge verification={v} locale={locale} today={today} />
    </NextIntlClientProvider>,
  );
}

describe('VerificationBadge — échéance de nextVerification', () => {
  it('échéance à venir : « Prochaine vérification prévue », pas de mention de retard', () => {
    const { container } = rendre('fr', verification({ nextVerification: '2026-12-01' }));
    expect(container.textContent).toContain('Prochaine vérification prévue : 1 déc. 2026');
    expect(container.textContent).not.toContain('en retard');
  });

  it('échéance dépassée : le texte porte « en retard » (fr)', () => {
    const { container } = rendre('fr', verification({ nextVerification: '2026-04-06' }));
    expect(container.textContent).toContain('Prochaine vérification prévue : 6 avr. 2026, en retard');
  });

  it('échéance dépassée : le texte porte « achterstallig » (nl)', () => {
    const { container } = rendre('nl', verification({ nextVerification: '2026-04-06' }));
    expect(container.textContent).toContain('achterstallig');
  });

  it('échéance = aujourd\'hui : encore dans les temps, pas « en retard »', () => {
    const { container } = rendre('fr', verification({ nextVerification: AUJOURDHUI }));
    expect(container.textContent).toContain('Prochaine vérification prévue');
    expect(container.textContent).not.toContain('en retard');
  });

  it('échéance dépassée de justesse (hier) : bascule quand même en retard', () => {
    const { container } = rendre('fr', verification({ nextVerification: '2026-09-23' }));
    expect(container.textContent).toContain('en retard');
  });

  it('accepte un horodatage Velite complet (s.isodate()) pour la comparaison', () => {
    const { container } = rendre(
      'fr',
      verification({ nextVerification: '2026-04-06T00:00:00.000Z' }),
    );
    expect(container.textContent).toContain('en retard');
  });

  it('sans nextVerification : aucune ligne, aucune erreur', () => {
    const { container } = rendre('fr', verification({ nextVerification: undefined }));
    expect(container.textContent).not.toContain('Prochaine vérification prévue');
    expect(container.textContent).not.toContain('en retard');
  });

  it('ne présente aucune violation axe, échéance dépassée', async () => {
    const { container } = rendre('fr', verification({ nextVerification: '2026-04-06' }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ne présente aucune violation axe, échéance à venir', async () => {
    const { container } = rendre('fr', verification({ nextVerification: '2026-12-01' }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
