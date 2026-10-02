// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Petit formulaire d'inscription des fiches. Jusqu'au 02/10/2026 il disait
 * « Suivre ce domaine par email » sur tous les types de fiche, n'affichait pas
 * l'information RGPD, envoyait un champ piège vide en dur, n'était ni mesuré
 * ni testé (revue du 01/10/2026).
 */
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import fs from 'node:fs';
import path from 'node:path';
import fr from '../../messages/fr.json';
import nl from '../../messages/nl.json';
import en from '../../messages/en.json';
import de from '../../messages/de.json';

const trackMock = vi.fn();
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/dossiers/lez',
}));

import { CardSubscribe } from './card-subscribe';

const MESSAGES = { fr, nl, en, de } as const;
type Langue = keyof typeof MESSAGES;
type Type = 'domain' | 'sector' | 'dossier' | 'commune';

function rendre(locale: Langue, type: Type, origine: 'fiche-haut' | 'fiche-bas' = 'fiche-bas') {
  return render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Europe/Brussels">
      <CardSubscribe topic="dossier-lez" type={type} origine={origine} />
    </NextIntlClientProvider>,
  );
}

/** La fiche telle qu'elle est servie depuis le lot 2 : un formulaire en haut, un en bas. */
function rendreLesDeux(locale: Langue = 'fr') {
  return render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Europe/Brussels">
      <CardSubscribe topic="dossier-lez" type="dossier" origine="fiche-haut" />
      <CardSubscribe topic="dossier-lez" type="dossier" origine="fiche-bas" />
    </NextIntlClientProvider>,
  );
}

type Envoi = (url: string, init: RequestInit) => Promise<Response>;
let fetchMock = vi.fn<Envoi>();
function reponse(status: number) {
  fetchMock = vi.fn<Envoi>(
    async () => new Response(JSON.stringify({ success: true }), { status }),
  );
  vi.stubGlobal('fetch', fetchMock);
}
const corpsEnvoye = () => JSON.parse(String(fetchMock.mock.calls[0][1].body));

function soumettre(container: HTMLElement, adresse = 'lecteur@example.org') {
  fireEvent.change(container.querySelector('input[type="email"]')!, {
    target: { value: adresse },
  });
  fireEvent.submit(container.querySelector('form')!);
}

beforeEach(() => trackMock.mockReset());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const TITRES: Record<Langue, Record<Type, string>> = {
  fr: {
    domain: 'Suivre ce domaine par email',
    sector: 'Suivre ce secteur par email',
    dossier: 'Suivre ce dossier par email',
    commune: 'Suivre cette commune par email',
  },
  nl: {
    domain: 'Volg dit domein per e-mail',
    sector: 'Volg deze sector per e-mail',
    dossier: 'Volg dit dossier per e-mail',
    commune: 'Volg deze gemeente per e-mail',
  },
  en: {
    domain: 'Follow this domain by email',
    sector: 'Follow this sector by email',
    dossier: 'Follow this dossier by email',
    commune: 'Follow this municipality by email',
  },
  de: {
    domain: 'Diesen Bereich per E-Mail verfolgen',
    sector: 'Diesen Sektor per E-Mail verfolgen',
    dossier: 'Dieses Dossier per E-Mail verfolgen',
    commune: 'Diese Gemeinde per E-Mail verfolgen',
  },
};
const CAS = (Object.keys(TITRES) as Langue[]).flatMap((l) =>
  (Object.keys(TITRES[l]) as Type[]).map((t) => [l, t] as const),
);

describe('CardSubscribe : libellé', () => {
  it.each(CAS)('%s / %s : le titre nomme le type de fiche', (locale, type) => {
    const { container } = rendre(locale, type);
    expect(container.querySelector('[data-titre]')!.textContent).toBe(TITRES[locale][type]);
  });

  it.each(['fr', 'nl', 'en', 'de'] as const)('%s : aucun libellé mort', (l) => {
    const m = MESSAGES[l].cardSubscribe as Record<string, unknown>;
    expect(m.successExisting).toBeUndefined();
    expect(m.title).toBeUndefined();
  });
});

describe('CardSubscribe : information RGPD au point de collecte', () => {
  it.each([
    ['fr', 'Politique de confidentialité'],
    ['nl', 'Privacybeleid'],
    ['en', 'Privacy policy'],
    ['de', 'Datenschutzrichtlinie'],
  ] as const)('%s : responsable et lien vers la politique', (locale, libelle) => {
    const { container } = rendre(locale, 'dossier');
    const liens = [...container.querySelectorAll('a')].filter(
      (a) => a.getAttribute('href') === '/privacy',
    );
    expect(liens).toHaveLength(1);
    expect(liens[0].textContent).toBe(libelle);
    expect(container.textContent).toContain('Advice That SRL');
  });
});

describe('CardSubscribe : accessibilité', () => {
  it('le champ email a un nom accessible et un identifiant propre à son emplacement', () => {
    const haut = rendre('fr', 'dossier', 'fiche-haut');
    const champHaut = haut.getByLabelText('Suivre ce dossier par email') as HTMLInputElement;
    expect(champHaut.type).toBe('email');
    const idHaut = champHaut.id;
    cleanup();
    const bas = rendre('fr', 'dossier', 'fiche-bas');
    expect((bas.getByLabelText('Adresse email') as HTMLInputElement).id).not.toBe(idHaut);
  });
});

describe('CardSubscribe : envoi', () => {
  it('champ piège réel : caché, hors tabulation, et sa valeur part dans la requête', async () => {
    reponse(200);
    const { container } = rendre('fr', 'dossier');
    const piege = container.querySelector<HTMLInputElement>('input[name="website"]')!;
    expect(piege.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(piege.tabIndex).toBe(-1);
    fireEvent.change(piege, { target: { value: 'robot' } });
    soumettre(container);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(corpsEnvoye()).toEqual({
      email: 'lecteur@example.org',
      locale: 'fr',
      topics: ['dossier-lez'],
      origine: 'fiche-bas',
      website: 'robot',
    });
  });

  it('succès : annonce le même message pour tous, mesure sans l’adresse', async () => {
    reponse(200);
    const { container, findByRole } = rendre('fr', 'dossier', 'fiche-haut');
    soumettre(container);
    const statut = await findByRole('status');
    expect(statut.textContent).toContain('Si vous êtes déjà abonné');
    expect(corpsEnvoye().origine).toBe('fiche-haut');
    expect(trackMock.mock.calls).toEqual([
      ['inscription-reussie', { page: '/dossiers/lez', formulaire: 'fiche', emplacement: 'haut' }],
    ]);
    expect(JSON.stringify(trackMock.mock.calls)).not.toContain('example.org');
  });

  it('erreur du serveur : alerte, aucune mesure de réussite', async () => {
    reponse(500);
    const { container, findByRole } = rendre('fr', 'dossier');
    soumettre(container);
    await findByRole('alert');
    expect(trackMock).not.toHaveBeenCalled();
  });
});

/**
 * Lot 2 (02/10/2026) : le formulaire était à 90-98 % de la page, après la
 * dernière source. Il apparaît aussi en haut, sous le chapeau, en version
 * compacte : le titre devient l'étiquette visible du champ, sur une ligne.
 */
describe('CardSubscribe : formulaire du haut', () => {
  it.each(CAS)('%s / %s : le titre est l’étiquette du champ email', (locale, type) => {
    const r = rendre(locale, type, 'fiche-haut');
    const champ = r.getByLabelText(TITRES[locale][type]) as HTMLInputElement;
    expect(champ.type).toBe('email');
    expect(champ.required).toBe(true);
  });

  it('le formulaire du bas garde son titre et son étiquette de champ', () => {
    const r = rendre('fr', 'dossier', 'fiche-bas');
    expect((r.getByLabelText('Adresse email') as HTMLInputElement).type).toBe('email');
    expect(r.container.querySelector('[data-titre]')!.tagName).toBe('P');
  });

  it('les deux formulaires d’une même fiche n’ont aucun identifiant en double', () => {
    const { container } = rendreLesDeux();
    const ids = [...container.querySelectorAll('[id]')].map((e) => e.id);
    expect(ids.length).toBeGreaterThanOrEqual(4);
    expect(new Set(ids).size).toBe(ids.length);
    for (const label of container.querySelectorAll('label')) {
      expect(container.querySelectorAll(`#${label.htmlFor}`)).toHaveLength(1);
    }
  });

  it('chaque formulaire porte un repère d’emplacement lisible par les sondes', () => {
    const { container } = rendreLesDeux();
    expect(container.querySelectorAll('[data-suivi="inscription-fiche-haut"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-suivi="inscription-fiche-bas"]')).toHaveLength(1);
  });

  it('le formulaire du haut n’est pas imprimé, et affiche promesse et information RGPD', () => {
    const { container } = rendre('fr', 'dossier', 'fiche-haut');
    const bloc = container.querySelector('[data-suivi="inscription-fiche-haut"]')!;
    expect(bloc.className).toContain('print:hidden');
    expect(bloc.textContent).toContain('le lundi');
    expect(bloc.querySelectorAll('a[href="/privacy"]')).toHaveLength(1);
  });

  it('réussite en bas : la mesure dit l’emplacement', async () => {
    reponse(200);
    const { container, findByRole } = rendre('fr', 'dossier', 'fiche-bas');
    soumettre(container);
    await findByRole('status');
    expect(trackMock.mock.calls).toEqual([
      ['inscription-reussie', { page: '/dossiers/lez', formulaire: 'fiche', emplacement: 'bas' }],
    ]);
  });
});

/** Les quatre types de fiche posent le formulaire deux fois : en haut, puis en bas. */
describe('CardSubscribe : pages de fiche', () => {
  it.each(['dossiers', 'domains', 'sectors', 'communes'])('%s : formulaire du haut avant le corps, puis celui du bas', (dossier) => {
    const source = fs.readFileSync(
      path.resolve(__dirname, `../app/[locale]/${dossier}/[slug]/page.tsx`),
      'utf8',
    );
    const origines = [...source.matchAll(/<CardSubscribe[\s\S]*?origine="(fiche-(?:haut|bas))"/g)].map((m) => m[1]);
    expect(origines).toEqual(['fiche-haut', 'fiche-bas']);
    const haut = source.indexOf('origine="fiche-haut"');
    const corps = source.search(/<(Dossier)?MdxContent/);
    expect(corps).toBeGreaterThan(-1);
    expect(haut).toBeLessThan(corps);
    expect(haut).toBeGreaterThan(source.indexOf('<WhatChangedBanner'));
  });
});
