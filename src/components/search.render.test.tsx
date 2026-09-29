// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'fr',
}));

const trackMock = vi.fn();
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

// Index Pagefind factice : l'import dynamique du composant vise ce chemin. La
// réponse dépend du terme, pour couvrir les trois tranches de résultats.
vi.mock('/pagefind/pagefind.js', () => {
  const resultat = (id: string, url: string, titre: string, excerpt = titre) => ({
    id,
    data: async () => ({ url, meta: { title: titre }, excerpt }),
  });
  return {
    init: () => {},
    search: async (term: string) => {
      if (term.includes('rien')) return { results: [] };
      if (term.includes('beaucoup')) {
        return {
          results: Array.from({ length: 6 }, (_, i) =>
            resultat(`b${i}`, `/fr/dossiers/dossier-${i}.html`, `Dossier ${i}`),
          ),
        };
      }
      return {
        results: [
          resultat(
            '1',
            '/fr/domaines/mobilite.html',
            'Mobilité',
            'a<img src=x onerror=alert(1)> <mark>mobilité</mark> &lt;script&gt;',
          ),
          resultat('2', '/fr/communes/ixelles.html', 'Ixelles'),
          resultat('3', '/fr/radar.html', 'Radar'),
        ],
      };
    },
  };
});

import { Search } from './search';

afterEach(cleanup);
beforeEach(() => trackMock.mockReset());

/** Ouvre le dialogue par le premier bouton rendu et renvoie le champ. */
function ouvrir(container: HTMLElement): HTMLInputElement {
  fireEvent.click(container.querySelector('button')!);
  return document.querySelector<HTMLInputElement>('#search-input')!;
}

/** Attend l'affichage de la liste (Pagefind chargé, recherche aboutie). */
function attendreResultats() {
  return vi.waitFor(
    () => {
      const ul = document.querySelector('#search-results');
      if (!ul) throw new Error('pas encore de résultats');
      return ul;
    },
    { timeout: 3000 },
  );
}

/** Tape une chaîne caractère par caractère, comme au clavier. */
function taper(input: HTMLInputElement, texte: string) {
  for (let i = 1; i <= texte.length; i++) {
    fireEvent.change(input, { target: { value: texte.slice(0, i) } });
  }
}

const appels = (nom: string) => trackMock.mock.calls.filter(([e]) => e === nom);

function attendreEvenement(nom: string) {
  return vi.waitFor(
    () => {
      const a = appels(nom);
      if (a.length === 0) throw new Error(`${nom} pas encore émis`);
      return a;
    },
    { timeout: 3000 },
  );
}

describe('Search — mesure d’audience', () => {
  it('recherche-ouverte porte l’origine, déduite de l’instance', () => {
    const entete = render(<Search />);
    ouvrir(entete.container);
    expect(trackMock).toHaveBeenLastCalledWith('recherche-ouverte', { origine: 'entete' });
    cleanup();

    const mobile = render(<Search variante="icone" raccourciClavier={false} />);
    ouvrir(mobile.container);
    expect(trackMock).toHaveBeenLastCalledWith('recherche-ouverte', { origine: 'mobile' });
    cleanup();

    const menu = render(<Search raccourciClavier={false} />);
    ouvrir(menu.container);
    expect(trackMock).toHaveBeenLastCalledWith('recherche-ouverte', { origine: 'menu' });
    cleanup();

    render(<Search />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(trackMock).toHaveBeenLastCalledWith('recherche-ouverte', { origine: 'raccourci' });
    // Refermer par le raccourci n'est pas une ouverture.
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(appels('recherche-ouverte')).toHaveLength(4);
  });

  it('ouvrir sans taper ne produit que recherche-ouverte', async () => {
    const { container } = render(<Search />);
    ouvrir(container);
    // Laisse le temps à Pagefind de se charger et au délai de mesure de s'écouler.
    await new Promise((r) => setTimeout(r, 1300));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trackMock.mock.calls.map(([e]) => e)).toEqual(['recherche-ouverte']);
  });

  it('recherche-requete part une seule fois par ouverture, après la frappe', async () => {
    const { container } = render(<Search />);
    const input = ouvrir(container);
    taper(input, 'mobilite');
    await attendreResultats();
    const [[, donnees]] = await attendreEvenement('recherche-requete');
    expect(donnees).toEqual({ resultats: '1-4', langue: 'fr' });

    // Nouvelle saisie dans la même ouverture : pas de second événement.
    taper(input, 'beaucoup');
    await new Promise((r) => setTimeout(r, 1300));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(appels('recherche-requete')).toHaveLength(1);

    // Nouvelle ouverture : nouvelle mesure possible.
    const input2 = ouvrir(container);
    taper(input2, 'beaucoup de choses');
    await vi.waitFor(
      () => {
        if (appels('recherche-requete').length < 2) throw new Error('attente');
      },
      { timeout: 3000 },
    );
    expect(appels('recherche-requete')[1][1]).toEqual({ resultats: '5+', langue: 'fr' });
  });

  it('recherche-requete compte aussi « aucun résultat », en tranche 0', async () => {
    const { container } = render(<Search />);
    const input = ouvrir(container);
    taper(input, 'rien du tout');
    const [[, donnees]] = await attendreEvenement('recherche-requete');
    expect(donnees).toEqual({ resultats: '0', langue: 'fr' });
  });

  it('recherche-clic porte le rang et le type, après la requête', async () => {
    const { container } = render(<Search />);
    const input = ouvrir(container);
    taper(input, 'mobilite');
    const liste = await attendreResultats();
    // Clic avant la fin du délai : la requête part d'abord, sans attendre.
    fireEvent.click(liste.querySelectorAll('a')[1]);

    const noms = trackMock.mock.calls.map(([e]) => e);
    expect(noms).toEqual(['recherche-ouverte', 'recherche-requete', 'recherche-clic']);
    expect(appels('recherche-clic')[0][1]).toEqual({ rang: 2, type: 'commune' });
  });

  it('aucun événement ne contient le texte saisi, ni sa longueur', async () => {
    const temoin = 'mobilite Jean Temoinxq 1050 rue Haute';
    const { container } = render(<Search />);
    const input = ouvrir(container);
    taper(input, temoin);
    const liste = await attendreResultats();
    await attendreEvenement('recherche-requete');
    fireEvent.click(liste.querySelectorAll('a')[0]);
    ouvrir(container);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(appels('recherche-clic')).toHaveLength(1);
    const envoye = JSON.stringify(trackMock.mock.calls);
    // La chaîne entière, puis chaque mot : une troncature ou un découpage ne
    // doit pas davantage passer.
    expect(envoye).not.toContain(temoin);
    for (const mot of temoin.split(' ')) {
      expect(envoye.toLowerCase()).not.toContain(mot.toLowerCase());
    }
    // Aucune valeur numérique égale à la longueur saisie.
    const nombres = trackMock.mock.calls.flatMap(([, d]) =>
      Object.values((d ?? {}) as Record<string, unknown>).filter((v) => typeof v === 'number'),
    );
    expect(nombres).not.toContain(temoin.length);
  });
});

describe('Search — dialogue modal', () => {
  it("s'affiche via un portail sur <body>, hors de l'entête", () => {
    // Reproduit la structure réelle : le <header> porte `backdrop-blur`, qui
    // crée un bloc conteneur pour les descendants `position: fixed`. Le
    // dialogue doit donc sortir du header par un portail, sinon `inset-0` se
    // cale sur le header et non sur la fenêtre (bug iOS Brave, 07/08/2026).
    const { container } = render(
      <header className="backdrop-blur-sm">
        <Search />
      </header>,
    );

    fireEvent.click(container.querySelector('button')!);

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(container.contains(dialog)).toBe(false);
    expect(dialog!.parentElement).toBe(document.body);
  });

  it("utilise un champ à 16 px pour éviter le zoom automatique iOS", () => {
    const { container } = render(<Search />);
    fireEvent.click(container.querySelector('button')!);

    const input = document.querySelector<HTMLInputElement>('#search-input')!;
    // iOS (WebKit, donc aussi Brave) zoome à la mise au point sur tout champ
    // dont la taille de police est < 16 px. `text-base` = 1rem = 16 px.
    expect(input.className).toContain('text-base');
    expect(input.className).not.toMatch(/(^|\s)text-sm(\s|$)/);
  });
});

describe('Search — extraits Pagefind', () => {
  it("rend l'extrait en texte : aucune balise injectée, <mark> conservé", async () => {
    // Revue red team du 28/09 : l'extrait était nettoyé par regex puis injecté
    // par dangerouslySetInnerHTML ; une balise non fermée passait.
    const { container } = render(<Search />);
    fireEvent.click(container.querySelector('button')!);
    const input = document.querySelector<HTMLInputElement>('#search-input')!;
    fireEvent.change(input, { target: { value: 'mobilite' } });

    const liste = await vi.waitFor(
      () => {
        const ul = document.querySelector('#search-results');
        if (!ul) throw new Error('pas encore de résultats');
        return ul;
      },
      { timeout: 3000 },
    );
    expect(liste.querySelector('img')).toBeNull();
    expect(liste.querySelector('script')).toBeNull();
    expect(liste.querySelector('mark')?.textContent).toBe('mobilité');
    expect(liste.textContent).toContain('<script>');
  });
});
