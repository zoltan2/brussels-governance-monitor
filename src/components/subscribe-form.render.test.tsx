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

/**
 * Lot 2 (02/10/2026) : les thèmes que le lecteur a sous les yeux sur l'accueil
 * sont proposés en premier. Une pastille du haut et la même pastille dans les
 * listes complètes ne font qu'un seul choix.
 */
describe('SubscribeForm : thèmes de la page', () => {
  const DOSSIERS = [
    { id: 'dossier-lez', label: 'LEZ' },
    { id: 'dossier-slrb', label: 'SLRB' },
  ];
  function rendreAvec(sujets: string[] | undefined, locale: 'fr' | 'nl' | 'en' | 'de' = 'fr') {
    return render(
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Europe/Brussels">
        <SubscribeForm dossierOptions={DOSSIERS} sujetsDeLaPage={sujets} />
      </NextIntlClientProvider>,
    );
  }
  const groupe = (c: HTMLElement) => c.querySelector('fieldset[data-groupe="page"]');
  const case_ = (c: HTMLElement, nom: string) => c.querySelector<HTMLInputElement>(`input[name="${nom}"]`)!;

  it('sans la propriété (page /subscribe) : aucun groupe, rien ne change', () => {
    expect(groupe(rendreAvec(undefined).container)).toBeNull();
    expect(groupe(rendreAvec([]).container)).toBeNull();
  });

  it.each([
    ['fr', 'Les thèmes de cette page'],
    ['nl', "De thema's van deze pagina"],
    ['en', 'Topics on this page'],
    ['de', 'Die Themen dieser Seite'],
  ] as const)('%s : le groupe est en tête, sous son intertitre', (locale, intertitre) => {
    const { container } = rendreAvec(['dossier-lez', 'housing', 'horeca'], locale);
    const g = groupe(container)!;
    expect(g.querySelector('legend')!.textContent).toBe(intertitre);
    const fieldsets = [...container.querySelectorAll('fieldset')];
    expect(fieldsets[0]).toBe(g);
  });

  it('affiche les thèmes passés, dans l’ordre, avec leur libellé, non cochés', () => {
    const { container } = rendreAvec(['dossier-lez', 'housing', 'horeca']);
    const cases = [...groupe(container)!.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(cases.map((i) => i.name)).toEqual(['page-dossier-lez', 'page-housing', 'page-horeca']);
    expect(cases.map((i) => i.closest('label')!.textContent)).toEqual(['LEZ', 'Logement', 'Horeca']);
    expect(cases.every((i) => !i.checked)).toBe(true);
  });

  it('dédoublonne, et écarte un thème que le formulaire ne connaît pas', () => {
    const { container } = rendreAvec(['housing', 'housing', 'dossier-inconnu', 'engagements', 'solutions']);
    const cases = [...groupe(container)!.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(cases.map((i) => i.name)).toEqual(['page-housing']);
  });

  it('un thème coché par défaut l’est aussi dans le groupe de la page', () => {
    const { container } = rendreAvec(['budget', 'housing']);
    expect(case_(container, 'page-budget').checked).toBe(true);
    expect(case_(container, 'page-housing').checked).toBe(false);
  });

  it('cocher en haut coche dans les listes complètes, et l’inverse', () => {
    const { container } = rendreAvec(['dossier-lez', 'housing', 'horeca']);
    fireEvent.click(case_(container, 'page-housing'));
    expect(case_(container, 'topic-housing').checked).toBe(true);
    fireEvent.click(case_(container, 'page-horeca'));
    expect(case_(container, 'sector-horeca').checked).toBe(true);
    fireEvent.click(case_(container, 'page-dossier-lez'));
    expect(case_(container, 'dossier-dossier-lez').checked).toBe(true);
    // Sens inverse : décocher dans la liste complète décoche en haut.
    fireEvent.click(case_(container, 'topic-housing'));
    expect(case_(container, 'page-housing').checked).toBe(false);
    fireEvent.click(case_(container, 'dossier-dossier-slrb'));
    expect(case_(container, 'dossier-dossier-slrb').checked).toBe(true);
  });

  it('une pastille cochée en haut envoie la bonne clé, une seule fois', async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () => new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { container, findByRole } = rendreAvec(['dossier-lez', 'horeca', 'budget']);
    fireEvent.click(case_(container, 'page-dossier-lez'));
    fireEvent.click(case_(container, 'page-horeca'));
    fireEvent.change(container.querySelector('input[type="email"]')!, {
      target: { value: 'a@example.org' },
    });
    fireEvent.submit(container.querySelector('form')!);
    await findByRole('status');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body)).topics).toEqual([
      'budget',
      'mobility',
      'horeca',
      'dossier-lez',
    ]);
  });

  it('la pastille garde un focus visible, comme celles des listes', () => {
    const { container } = rendreAvec(['housing']);
    expect(case_(container, 'page-housing').closest('label')!.className).toContain(
      'has-[:focus-visible]:ring-2',
    );
  });
});
