// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup, fireEvent } from '@testing-library/react';
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

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

/**
 * 02/10/2026 : le thème « engagements » était coché par défaut alors qu'aucun
 * digest ne part pour lui. Il n'est plus proposé (l'API l'accepte toujours).
 */
describe('SubscribeForm : sujets proposés', () => {
  it('« engagements » n’est ni proposé ni coché ; budget et mobilité sont cochés', () => {
    const { container } = rendre('fr');
    expect(container.querySelector('input[name="topic-budget"]')).not.toBeNull();
    expect(container.querySelector('input[name="topic-engagements"]')).toBeNull();
    const coches = [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
      .filter((i) => i.checked)
      .map((i) => i.name);
    expect(coches).toEqual(['topic-budget', 'topic-mobility']);
  });
});

/**
 * La promesse dit ce que le digest fait : un envoi le lundi, les semaines où
 * les sujets suivis ont bougé. Les libellés « Thèmes mis à jour » décrivaient
 * une réponse que la route ne rend plus depuis le 21/09/2026.
 */
describe('SubscribeForm : promesse et message de succès', () => {
  it.each([
    ['fr', /lundi/, /hebdomadaire/],
    ['nl', /maandag/, /wekelijkse/],
    ['en', /Mondays/, /weekly/],
    ['de', /montags/, /wöchentliche/],
  ] as const)('%s : jour annoncé, plus de promesse hebdomadaire sans condition, plus de libellé mort', (l, jour, hebdo) => {
    const m = MESSAGES[l] as unknown as Record<string, Record<string, unknown>>;
    expect(m.subscribe.successExistingTitle).toBeUndefined();
    expect(m.subscribe.successExistingMessage).toBeUndefined();
    for (const texte of [
      m.subscribe.subtitle,
      m.subscribeConfirm.successMessage,
      m.subscribeConfirmed.successMessage,
    ]) {
      expect(String(texte)).toMatch(jour);
      expect(String(texte)).not.toMatch(hebdo);
    }
    expect(String(m.subscribeConfirm.alreadyMessage)).not.toMatch(hebdo);
  });

  it('envoie l’origine « accueil » et affiche le même message pour tous', async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () => new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { container, findByRole } = rendre('fr');
    fireEvent.change(container.querySelector('input[type="email"]')!, {
      target: { value: 'a@example.org' },
    });
    fireEvent.submit(container.querySelector('form')!);
    const statut = await findByRole('status');
    expect(statut.textContent).toContain('Si vous êtes déjà abonné');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toMatchObject({
      origine: 'accueil',
      topics: ['budget', 'mobility'],
    });
  });
});
