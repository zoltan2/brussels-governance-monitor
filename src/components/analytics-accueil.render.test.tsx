// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Mesures ajoutées le 28/09/2026 après la revue de l'accueil (équipe GREEN) :
 * tableau du gouvernement, cible du « fait du jour », page de l'inscription,
 * liens de l'en-tête et du pied de page. On vérifie le balisage et l'appel à
 * `track()`, jamais la réception (voir src/lib/analytics.ts).
 */
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const trackMock = vi.fn();
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

let pathnameCourant = '/';
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: unknown; children: ReactNode }) => (
    <a
      href={typeof href === 'string' ? href : String((href as { pathname: string }).pathname)}
      {...rest}
    >
      {children}
    </a>
  ),
  usePathname: () => pathnameCourant,
}));

// Dépendances de l'en-tête sans rapport avec la mesure.
vi.mock('@/components/search', () => ({ Search: () => null }));
vi.mock('./layout/locale-switcher', () => ({ LocaleSwitcher: () => null }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next-intl', () => ({
  // `t.rich` : la mention RGPD du formulaire (#628) insère un lien dans le texte.
  useTranslations: () => Object.assign((key: string) => key, { rich: (key: string) => key }),
  useLocale: () => 'fr',
}));

import { GovernmentTable } from './government-table';
import { LatestUpdateBar } from './latest-update-bar';
import { SubscribeForm } from './subscribe-form';
import { NavLink } from './layout/nav-link';
import { Footer } from './layout/footer';
import { Header } from './layout/header';

beforeEach(() => {
  trackMock.mockReset();
  pathnameCourant = '/';
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('tableau du gouvernement (accueil)', () => {
  it('mesure l’ouverture et la fermeture, avec etat', () => {
    const { container } = render(<GovernmentTable locale="fr" inline />);
    const details = container.querySelector('details')!;
    expect(details.open).toBe(false);

    details.open = true;
    fireEvent(details, new Event('toggle'));
    details.open = false;
    fireEvent(details, new Event('toggle'));

    expect(trackMock.mock.calls).toEqual([
      ['accueil-gouvernement', { etat: 'ouvert' }],
      ['accueil-gouvernement', { etat: 'ferme' }],
    ]);
  });

  it('ne mesure rien en pleine page, où il est ouvert d’office', () => {
    const { container } = render(<GovernmentTable locale="fr" />);
    const details = container.querySelector('details')!;
    expect(details.open).toBe(true);
    fireEvent(details, new Event('toggle'));
    expect(trackMock).not.toHaveBeenCalled();
  });
});

describe('fait du jour', () => {
  it('garde son nom et dit quel fait a été cliqué', () => {
    const { container } = render(
      <LatestUpdateBar
        date="2026-09-28"
        headline="Titre"
        isCorrection={false}
        cardTitle="Zone de basses émissions"
        section="dossiers"
        targetSlug="lez"
        locale="fr"
      />,
    );
    // Mesuré par track() au clic, plus par data-umami-event : sur un lien annoté,
    // le traceur bloque le clic et recharge toute la page (TrackedLink).
    const a = container.querySelector('a')!;
    expect(a.hasAttribute('data-umami-event')).toBe(false);
    fireEvent.click(a);
    expect(trackMock).toHaveBeenCalledWith('accueil-fait-du-jour', { cible: 'dossiers:lez' });
  });
});

describe('formulaire d’inscription', () => {
  const OPTIONS = [{ id: 'd1', label: 'Dossier 1' }];

  it('garde le nom accueil-inscription et distingue la page', () => {
    for (const [chemin, attendu] of [
      ['/', 'accueil'],
      ['/subscribe', '/subscribe'],
    ] as const) {
      pathnameCourant = chemin;
      const { container, unmount } = render(<SubscribeForm dossierOptions={OPTIONS} />);
      const bouton = container.querySelector('button[type="submit"]')!;
      expect(bouton.getAttribute('data-umami-event')).toBe('accueil-inscription');
      expect(bouton.getAttribute('data-umami-event-page')).toBe(attendu);
      unmount();
    }
  });

  it('mesure l’inscription réussie, sans l’adresse', async () => {
    pathnameCourant = '/subscribe';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
    const { container } = render(<SubscribeForm dossierOptions={OPTIONS} />);
    const email = container.querySelector('input[type="email"]') as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'lecteur@example.org' } });
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(trackMock).toHaveBeenCalled());
    expect(trackMock.mock.calls).toEqual([
      ['inscription-reussie', { page: '/subscribe', formulaire: 'complet' }],
    ]);
    expect(JSON.stringify(trackMock.mock.calls)).not.toContain('example.org');
  });

  it('ne mesure pas de réussite sur une erreur du serveur', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 500 })),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container, findByRole } = render(<SubscribeForm dossierOptions={OPTIONS} />);
    const email = container.querySelector('input[type="email"]') as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'lecteur@example.org' } });
    fireEvent.submit(container.querySelector('form')!);
    await findByRole('alert');
    expect(trackMock).not.toHaveBeenCalled();
  });
});

/**
 * Chaque `<a>` rendu est mesuré : soit il porte `data-umami-event`, soit un clic
 * appelle `track()`. Aucune liste d'exceptions : un lien ajouté sans mesure fait
 * rougir le test. Un rendu neuf par lien, parce qu'un clic referme les menus et
 * détache les liens suivants.
 */
function liensNonMesures(rendre: () => HTMLElement): string[] {
  const total = rendre().querySelectorAll('a').length;
  cleanup();
  const oublies: string[] = [];
  for (let i = 0; i < total; i++) {
    const a = rendre().querySelectorAll('a')[i];
    if (!a.hasAttribute('data-umami-event')) {
      trackMock.mockReset();
      a.addEventListener('click', (e) => e.preventDefault());
      fireEvent.click(a);
      if (trackMock.mock.calls.length === 0) oublies.push(a.getAttribute('href') ?? '?');
    }
    cleanup();
  }
  return oublies;
}

function enteteMenusOuverts(): HTMLElement {
  const { container, getByText, getByLabelText } = render(<Header />);
  fireEvent.click(getByText('explore', { selector: 'nav[aria-label="Main"] button' }));
  fireEvent.click(getByLabelText('Menu', { selector: 'button' }));
  fireEvent.click(getByText('explore', { selector: 'nav[aria-label="Menu"] button' }));
  return container;
}

describe('liens de navigation commune', () => {
  it('mesure tous les liens du pied de page', () => {
    expect(render(<Footer />).container.querySelectorAll('a').length).toBeGreaterThan(10);
    cleanup();
    expect(liensNonMesures(() => render(<Footer />).container)).toEqual([]);
  });

  it('mesure tous les liens de l’en-tête, menu déroulant et menu mobile ouverts', () => {
    const container = enteteMenusOuverts();
    // Témoin : les trois zones sont bien rendues, sinon le test ne prouverait rien.
    expect(container.querySelectorAll('[role="menuitem"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('nav[aria-label="Menu"] a').length).toBeGreaterThan(5);
    cleanup();
    expect(liensNonMesures(enteteMenusOuverts)).toEqual([]);
  });

  it('mesure le soutien de l’en-tête dans la famille soutien-clic', () => {
    const { container } = render(<Header />);
    const a = container.querySelector('nav[aria-label="Main"] a[href="/support"]')!;
    a.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(a);
    expect(trackMock.mock.calls).toEqual([['soutien-clic', { position: 'entete' }]]);
  });

  it('envoie navigation-clic avec zone et cible, et garde le onClick existant', () => {
    const fermer = vi.fn();
    const { container } = render(
      <NavLink zone="entete-mobile" href="/dossiers" onClick={fermer}>
        Dossiers
      </NavLink>,
    );
    const a = container.querySelector('a')!;
    a.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(a);
    expect(trackMock.mock.calls).toEqual([['navigation-clic', { zone: 'entete-mobile', cible: '/dossiers' }]]);
    expect(fermer).toHaveBeenCalledTimes(1);
  });
});
