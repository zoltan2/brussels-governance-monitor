// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import fr from '../../messages/fr.json';
import nl from '../../messages/nl.json';
import en from '../../messages/en.json';
import de from '../../messages/de.json';

// `@/i18n/navigation` appelle createNavigation(routing), qui importe `next/navigation`.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  // Le formulaire lit la page courante pour la propriété `page` de ses
  // événements (#626) : sans cet export, le rendu échoue.
  usePathname: () => '/',
}));

import { SubscribeForm } from './subscribe-form';

afterEach(() => cleanup());

const MESSAGES = { fr, nl, en, de } as const;

function rendre(locale: 'fr' | 'nl' | 'en' | 'de') {
  return render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Europe/Brussels">
      <SubscribeForm dossierOptions={[]} />
    </NextIntlClientProvider>,
  );
}

/**
 * RGPD art. 13 : l'information se donne au point de collecte. Le formulaire de
 * l'accueil n'affichait que « Max. 1 email/semaine. Désabonnement en 1 clic. »,
 * sans responsable ni lien vers la politique (revue du 28/09/2026).
 */
describe('SubscribeForm : information RGPD au point de collecte', () => {
  it.each([
    ['fr', 'Politique de confidentialité'],
    ['nl', 'Privacybeleid'],
    ['en', 'Privacy policy'],
    ['de', 'Datenschutzrichtlinie'],
  ] as const)('%s : lien vers la politique de confidentialité DANS le formulaire', (locale, libelle) => {
    const { container } = rendre(locale);
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    const liens = [...form!.querySelectorAll('a')].filter((a) => a.getAttribute('href') === '/privacy');
    expect(liens).toHaveLength(1);
    expect(liens[0].textContent).toBe(libelle);
    expect(form!.textContent).toContain('Advice That SRL');
  });
});
