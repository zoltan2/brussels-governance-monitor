// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { act, render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

// `@/i18n/navigation` importe `next/navigation` en ESM, introuvable hors bundle Next
// (même bouchon que games-panel.render.test.tsx). Le lien vie privée du formulaire
// d'inscription en dépend.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, locale, ...rest }: { href: string; locale?: string; children: React.ReactNode }) => (
    <a href={`/${locale ?? 'fr'}${href === '/privacy' ? '/confidentialite' : href}`} {...rest}>
      {children}
    </a>
  ),
}));

import { StuutGame } from './stuut-game';
import { CLE_INSCRIT, CLE_INVITATION, CLE_STATS, STUUT_API_INSCRIPTION, STUUT_API_JOUR } from '@/lib/stuut';

const JOUR = {
  jour: '2026-09-18',
  numero: 95,
  mot: 'CABINET',
  definition: 'Équipe rapprochée qui entoure un ministre.',
  url: 'https://governance.brussels/fr/dossiers/reforme-administration',
  appat: 'CANTINE',
};

function repondre(corps: unknown, ok = true) {
  globalThis.fetch = vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => corps })) as unknown as typeof fetch;
}

/** Une lettre déjà jouée s'annonce avec son verdict (« C, bien placée ») : on vise le début du nom. */
function touche(nom: string) {
  const motif = nom.length === 1 ? new RegExp(`^${nom}(,|$)`) : nom;
  fireEvent.click(screen.getByRole('button', { name: motif }));
}

/** Tape un mot au clavier du jeu ; la première lettre est déjà offerte. */
function taper(mot: string) {
  for (const l of mot.slice(1)) touche(l);
  touche('Valider l’essai');
}

/**
 * Attend qu'un essai soit compté ET que le jeu soit déverrouillé. Le jeu reste
 * verrouillé jusqu'au setTimeout qui suit la validation (0 ms sans animation) :
 * une lettre tapée avant est ignorée, comme dans le jeu autonome. Sans cette
 * seconde attente, la suite complète, plus lente, faisait taper le test pendant
 * le verrou, et il attendait ensuite un essai qui ne venait jamais.
 */
async function attendreFinEssai(n: number) {
  await waitFor(() => expect(document.querySelectorAll('.sr-only ol li').length).toBe(n));
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  localStorage.clear();
  repondre(JOUR);
});
afterEach(cleanup);

describe('StuutGame', () => {
  it('lit le mot du jour sur l’API du Stuut, pas dans une copie locale', async () => {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    expect(globalThis.fetch).toHaveBeenCalledWith(STUUT_API_JOUR);
  });

  it('refuse un essai incomplet sans le compter', async () => {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    touche('A');
    touche('Valider l’essai');
    expect(await screen.findByText('Il manque des lettres', { selector: '[aria-live] , p' })).toBeTruthy();
    expect(document.querySelectorAll('ol li').length).toBe(0);
  });

  it('évalue un essai et l’annonce en toutes lettres', async () => {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    taper('CANTINE');
    const annonce = document.querySelector('[aria-live="polite"]')!;
    await waitFor(() => expect(annonce.textContent).toMatch(/Essai 1 sur 6 : CANTINE\. C bien placée, A bien placée, N ailleurs/));
  });

  it('salue le leurre du jour sans interrompre la partie', async () => {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    taper('CANTINE');
    expect(await screen.findByText(/CANTINE, le grand classique du genre/)).toBeTruthy();
    // La partie continue : le clavier est toujours là.
    await waitFor(() => expect(screen.getByRole('group', { name: 'Clavier du jeu' })).toBeTruthy());
  });

  it('révèle le mot, sa définition et un lien INTERNE vers le dossier après une victoire', async () => {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    taper('CABINET');

    expect(await screen.findByText('Du premier coup. Chapeau, vraiment.')).toBeTruthy();
    expect(screen.getByText(/Équipe rapprochée/)).toBeTruthy();
    const lien = screen.getByRole('link', { name: /Pour aller plus loin/ });
    expect(lien.getAttribute('href')).toBe('/fr/dossiers/reforme-administration');
    expect(lien.getAttribute('data-umami-event')).toBe('jeux-stuut-dossier');
    expect(screen.queryByRole('group', { name: 'Clavier du jeu' })).toBeNull();
  });

  it('enregistre la partie dans les statistiques locales', async () => {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    taper('CABINET');
    await screen.findByText('Du premier coup. Chapeau, vraiment.');

    const stats = JSON.parse(localStorage.getItem(CLE_STATS)!);
    expect(stats.played).toBe(1);
    expect(stats.dist[0]).toBe(1);
    expect(stats.today).toMatchObject({ day: 94, won: true, n: 1 });
  });

  it('perd après six essais et donne quand même le mot', async () => {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    for (let i = 0; i < 6; i++) {
      taper('CCCCCCC');
      await attendreFinEssai(i + 1);
    }
    expect(await screen.findByText('Celui-là était coriace.')).toBeTruthy();
    expect(screen.getByText(/Même les initiés sèchent parfois/)).toBeTruthy();
  });

  it('retrouve le résultat du jour au lieu d’un plateau rejouable', async () => {
    localStorage.setItem(
      CLE_STATS,
      JSON.stringify({ played: 1, wins: 1, streak: 1, max: 1, dist: [0, 1, 0, 0, 0, 0], lastDay: 94, today: { day: 94, won: true, n: 2, grid: '🟩' } }),
    );
    render(<StuutGame actif />);
    expect(await screen.findByText(/Vous avez déjà joué aujourd’hui/)).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Clavier du jeu' })).toBeNull();
  });

  it('ignore le clavier physique quand son onglet est masqué', async () => {
    const { rerender } = render(<StuutGame actif={false} />);
    await screen.findByText(/n°95/);
    fireEvent.keyDown(document, { key: 'a' });
    expect(document.querySelector('.sr-only p')!.textContent).toMatch(/Saisie en cours : C\./);

    rerender(<StuutGame actif />);
    fireEvent.keyDown(document, { key: 'a' });
    expect(document.querySelector('.sr-only p')!.textContent).toMatch(/Saisie en cours : CA\./);
  });

  it('prend le focus à la première lettre, pour que l’Entrée valide l’essai au lieu de fermer le panneau', async () => {
    // Reproduit le panneau : à l'ouverture, le focus est sur « Fermer ». Constaté au
    // navigateur le 18/09/2026 : mot tapé, Entrée, et le panneau se fermait.
    const { container } = render(
      <>
        <button type="button">Fermer</button>
        <StuutGame actif />
      </>,
    );
    await screen.findByText(/n°95/);
    const fermer = screen.getByRole('button', { name: 'Fermer' });
    fermer.focus();

    fireEvent.keyDown(fermer, { key: 'a' });

    const jeu = container.querySelector('[role="region"]')!;
    expect(jeu.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(fermer);
  });

  it('affiche une erreur avec un lien vers le jeu autonome si l’API échoue, puis réessaie', async () => {
    repondre({}, false);
    render(<StuutGame actif />);
    expect(await screen.findByText(/n'a pas pu être chargé/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /stuut\.governance\.brussels/ }).getAttribute('href')).toBe(
      'https://stuut.governance.brussels',
    );

    repondre(JOUR);
    touche('Réessayer');
    expect(await screen.findByText(/n°95/)).toBeTruthy();
  });

  it('refuse une réponse de forme inattendue', async () => {
    repondre({ questions: [] });
    render(<StuutGame actif />);
    expect(await screen.findByText(/n'a pas pu être chargé/)).toBeTruthy();
  });

  it("n'a aucune violation d'accessibilité, en cours de partie puis au résultat", async () => {
    const { container } = render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    taper('CANTINE');
    await attendreFinEssai(1);
    expect(await axe(container)).toHaveNoViolations();

    taper('CABINET');
    await screen.findByText('Tout en finesse.');
    fireEvent.click(screen.getByRole('button', { name: 'Mes statistiques' }));
    fireEvent.click(screen.getByRole('button', { name: 'Défier un ami' }));
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('StuutGame : inscription au Stuut par e-mail', () => {
  // Deux adresses distinctes : le mot du jour, et l'inscription. Chaque appel est noté.
  let appels: { url: string; init?: RequestInit }[] = [];
  let mesures: unknown[][] = [];
  function serveur(inscription: { status: number; attente?: Promise<void> } = { status: 200 }) {
    appels = [];
    globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      appels.push({ url, init });
      if (url === STUUT_API_INSCRIPTION) {
        if (inscription.attente) await inscription.attente;
        // Le corps n'est jamais lu par le formulaire : un json() piégé le prouve.
        return { ok: inscription.status < 400, status: inscription.status, json: async () => { throw new Error('lu'); } };
      }
      return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(JOUR)) };
    }) as unknown as typeof fetch;
  }
  const inscriptions = () => appels.filter((a) => a.url === STUUT_API_INSCRIPTION);
  const champ = () => screen.getByLabelText('Votre adresse e-mail') as HTMLInputElement;
  const envoyer = (adresse: string) => {
    fireEvent.change(champ(), { target: { value: adresse } });
    fireEvent.click(screen.getByRole('button', { name: "S'inscrire" }));
  };

  async function finirPartie() {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    taper('CABINET');
    await screen.findByText('Du premier coup. Chapeau, vraiment.');
  }

  beforeEach(() => {
    serveur();
    mesures = [];
    window.umami = { track: (...args: unknown[]) => void mesures.push(args) };
  });
  afterEach(() => {
    delete window.umami;
  });

  it("invite en fin de partie, et n'envoie que l'adresse, sans cookie, avec un délai maximal", async () => {
    await finirPartie();
    envoyer('  lecteur@exemple.be ');

    expect(await screen.findByText(/C'est noté/)).toBeTruthy();
    expect(inscriptions()).toHaveLength(1);
    const { init } = inscriptions()[0];
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('omit');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init?.body))).toEqual({ email: 'lecteur@exemple.be' });
    expect(localStorage.getItem(CLE_INSCRIT)).toBe('1');
  });

  it("ne mesure que l'emplacement du formulaire : ni l'adresse, ni son domaine", async () => {
    await finirPartie();
    envoyer('secret@domaine-prive.be');
    await screen.findByText(/C'est noté/);
    const inscription = mesures.filter((m) => m[0] === 'jeux-stuut-inscription');
    expect(inscription).toEqual([['jeux-stuut-inscription', { source: 'fin-partie' }]]);
    expect(JSON.stringify(mesures)).not.toMatch(/secret|domaine-prive/);
  });

  it("donne le focus à la confirmation, annoncée comme un statut, et ne promet pas un e-mail certain", async () => {
    await finirPartie();
    envoyer('a@exemple.be');
    const texte = await screen.findByText(/C'est noté/);
    expect(document.activeElement).toBe(texte);
    expect(texte.getAttribute('role')).toBe('status');
    expect(texte.textContent).toMatch(/Si cette adresse n'était pas encore inscrite/);
  });

  it("refuse une adresse invalide sans rien envoyer, la signale sur le champ, et l'efface à la correction", async () => {
    await finirPartie();
    envoyer('pas-une-adresse');
    expect(screen.getByText('Adresse e-mail invalide.')).toBeTruthy();
    expect(inscriptions()).toHaveLength(0);
    expect(champ().getAttribute('aria-invalid')).toBe('true');
    const idErreur = champ().getAttribute('aria-describedby');
    expect(idErreur && document.getElementById(idErreur)?.textContent).toMatch(/invalide/);

    fireEvent.change(champ(), { target: { value: 'pas-une-adresse@' } });
    expect(champ().getAttribute('aria-invalid')).toBeNull();
    expect(screen.queryByText('Adresse e-mail invalide.')).toBeNull();
  });

  it("sur un 429 : message dédié, champ NON marqué invalide, échec mesuré sans l'adresse, pas d'inscription", async () => {
    serveur({ status: 429 });
    await finirPartie();
    envoyer('a@exemple.be');
    expect(await screen.findByText(/Trop de tentatives/)).toBeTruthy();
    expect(champ().getAttribute('aria-invalid')).toBeNull();
    expect(localStorage.getItem(CLE_INSCRIT)).toBeNull();
    expect(mesures.filter((m) => m[0] === 'jeux-stuut-inscription')).toEqual([]);
    expect(mesures).toContainEqual(['jeux-stuut-inscription-echec', { source: 'fin-partie', statut: 429 }]);
  });

  it("en cas d'échec, propose un lien de repli vers l'inscription du jeu autonome", async () => {
    serveur({ status: 500 });
    await finirPartie();
    envoyer('a@exemple.be');
    const repli = await screen.findByRole('link', { name: /S'inscrire sur stuut\.governance\.brussels/ });
    expect(repli.getAttribute('href')).toBe('https://stuut.governance.brussels/inscription/');
  });

  it("ré-annonce une erreur identique à l'essai suivant (nouveau nœud dans la région live)", async () => {
    // Le cas sans état intermédiaire : deux formats invalides de suite. Le message ne
    // disparaît jamais entre les deux ; sans nœud neuf, rien ne serait ré-annoncé.
    await finirPartie();
    envoyer('pas-une-adresse');
    const premier = screen.getByText('Adresse e-mail invalide.');
    fireEvent.click(screen.getByRole('button', { name: "S'inscrire" }));
    expect(screen.getByText('Adresse e-mail invalide.')).not.toBe(premier);
  });

  it('annule la soumission native du formulaire (aucune navigation)', async () => {
    await finirPartie();
    fireEvent.change(champ(), { target: { value: 'a@exemple.be' } });
    // dispatchEvent rend false quand preventDefault a été appelé.
    expect(fireEvent.submit(champ().closest('form')!)).toBe(false);
    await screen.findByText(/C'est noté/);
  });

  it("désactive le bouton pendant l'envoi : une seule requête", async () => {
    let liberer = () => {};
    serveur({ status: 200, attente: new Promise<void>((r) => (liberer = r)) });
    await finirPartie();
    envoyer('a@exemple.be');
    const bouton = screen.getByRole('button', { name: 'Envoi…' });
    expect((bouton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(bouton.closest('form')!);
    liberer();
    await screen.findByText(/C'est noté/);
    expect(inscriptions()).toHaveLength(1);
  });

  it("n'invite pas un appareil inscrit, et n'horodate une invitation que si elle s'affiche", async () => {
    localStorage.setItem(CLE_INSCRIT, '1');
    await finirPartie();
    expect(screen.queryByLabelText('Votre adresse e-mail')).toBeNull();
    expect(localStorage.getItem(CLE_INVITATION)).toBeNull();
  });

  it("n'invite qu'une fois tous les trois jours, et horodate l'invitation affichée", async () => {
    localStorage.setItem(CLE_INVITATION, String(Date.now() - 86_400_000));
    await finirPartie();
    expect(screen.queryByLabelText('Votre adresse e-mail')).toBeNull();
    cleanup();
    localStorage.removeItem(CLE_INVITATION);
    localStorage.removeItem(CLE_STATS); // sinon la partie est « déjà jouée » : pas de clavier
    await finirPartie();
    expect(screen.getByLabelText('Votre adresse e-mail')).toBeTruthy();
    expect(Number(localStorage.getItem(CLE_INVITATION))).toBeGreaterThan(Date.now() - 60_000);
  });

  it("invite aussi quand on retrouve le résultat du jour au rechargement", async () => {
    localStorage.setItem(
      CLE_STATS,
      JSON.stringify({ played: 1, wins: 1, streak: 1, max: 1, dist: [1, 0, 0, 0, 0, 0], lastDay: 94, today: { day: 94, won: true, n: 1, grid: '🟩' } }),
    );
    render(<StuutGame actif />);
    await screen.findByText(/Vous avez déjà joué aujourd’hui/);
    expect(screen.getByLabelText('Votre adresse e-mail')).toBeTruthy();
  });

  it("l'en-tête : formulaire toujours à portée, focus dans le champ, frappe qui ne part pas sur le plateau", async () => {
    render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir par e-mail' }));
    expect(document.activeElement).toBe(champ());
    // Le clavier physique du jeu écoute le document : une lettre tapée DANS le champ
    // ne doit rien écrire sur le plateau.
    fireEvent.keyDown(champ(), { key: 'j' });
    expect(document.querySelector('.sr-only p')!.textContent).toMatch(/Saisie en cours : C\./);
    expect(screen.getByRole('link', { name: 'page vie privée' }).getAttribute('target')).toBe('_blank');
  });

  it("les deux formulaires partagent l'état : inscrit par l'en-tête, plus d'invitation en fin de partie", async () => {
    await finirPartie();
    expect(screen.getAllByLabelText('Votre adresse e-mail')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir par e-mail' }));
    const [enTete] = screen.getAllByLabelText('Votre adresse e-mail');
    fireEvent.change(enTete, { target: { value: 'a@exemple.be' } });
    fireEvent.click(screen.getAllByRole('button', { name: "S'inscrire" })[0]);
    await screen.findByText(/C'est noté/);
    expect(screen.queryAllByLabelText('Votre adresse e-mail')).toHaveLength(0);
  });

  it("dit « déjà inscrit » dans l'en-tête après une inscription en fin de partie", async () => {
    await finirPartie();
    envoyer('a@exemple.be');
    await screen.findByText(/C'est noté/);
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir par e-mail' }));
    expect(screen.getByText(/Cet appareil est déjà inscrit/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'page vie privée' }).getAttribute('href')).toBe('/fr/confidentialite');
  });

  it("n'a aucune violation d'accessibilité, formulaire ouvert puis en erreur", async () => {
    const { container } = render(<StuutGame actif />);
    await screen.findByText(/n°95/);
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir par e-mail' }));
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(screen.getByRole('button', { name: "S'inscrire" }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
