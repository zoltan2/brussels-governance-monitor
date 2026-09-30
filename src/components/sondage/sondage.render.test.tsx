// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import type { EtatInitial } from '@/lib/sondage/page-etat';
import { etapeSuivante, nettoyer, type Etape, type Reponses } from '@/lib/sondage/questionnaire';
import { Sondage } from './sondage';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

// Faux serveur : l'environnement jsdom ne charge pas `node:sqlite`. La logique
// réelle de la route est testée par src/lib/sondage/traitement.test.ts ; ici,
// le serveur suit le même parcours (questionnaire.ts) et garde les corps reçus.
let recus: Record<string, unknown>[];
let enregistrees: Reponses;
const umami = vi.fn();

beforeEach(() => {
  recus = [];
  enregistrees = {};
  umami.mockClear();
  window.umami = { track: umami };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      const corps = JSON.parse(String(init.body)) as { etape: string; reponse?: unknown };
      recus.push(corps);
      const repondre = (json: unknown) => new Response(JSON.stringify(json), { status: 200 });
      if (corps.etape === 'accueil') return repondre({ ok: true, suivante: 'q1' });
      if (corps.etape === 'q9') return repondre({ ok: true, termine: true });
      enregistrees = nettoyer({ ...enregistrees, [corps.etape]: corps.reponse });
      return repondre({ ok: true, suivante: etapeSuivante(enregistrees, corps.etape as Etape) });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function rendre(initial: EtatInitial = { mode: 'accueil' }, langue: 'fr' | 'nl' = 'fr') {
  return render(<Sondage langue={langue} initial={initial} pilote={false} lienNotice="/fr/confidentialite#sondage" />);
}

async function titreActif(texte: RegExp) {
  await waitFor(() => {
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toMatch(texte);
    expect(document.activeElement).toBe(h1);
  });
}

function suivant() {
  fireEvent.click(screen.getByRole('button', { name: /Suivant|Terminer/ }));
}

describe('Sondage : écrans et accessibilité', () => {
  it('accueil : texte validé, lien vers la notice, zone de statut montée, sans violation axe', async () => {
    const { container } = rendre();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Dix questions sur le digest');
    expect(container.textContent).toContain('Les critiques nous aident plus que les compliments.');
    expect(container.textContent).toContain('jusqu\'au 6 décembre 2027');
    expect(screen.getByRole('link', { name: 'Comment vos réponses sont traitées' }).getAttribute('href')).toBe(
      '/fr/confidentialite#sondage',
    );
    expect(screen.getByRole('status')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('focus sur le titre à chaque écran, progression réelle, branche Q1b', async () => {
    const { container } = rendre();
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    await titreActif(/Question 1 sur 10.*En général/);
    fireEvent.click(screen.getByLabelText('rarement'));
    // Le parcours se raccourcit dès le choix : Q1b puis Q7, Q8, Q9.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Question 1 sur 5/);
    suivant();
    await titreActif(/Question 2 sur 5.*empêche/);
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(screen.getByRole('button', { name: 'Précédent' }));
    await titreActif(/Question 1 sur 5/);
  });

  it('Q1 obligatoire : erreur annoncée et liée au groupe', async () => {
    const { container } = rendre({ mode: 'reprise', reponses: {}, etape: 'q1' });
    suivant();
    const erreur = await screen.findByText('Choisissez une réponse pour continuer.');
    const idErreur = erreur.closest('p')!.id;
    expect(screen.getByRole('status').contains(erreur)).toBe(true);
    expect(container.querySelector('fieldset')!.getAttribute('aria-describedby')).toContain(idErreur);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('Q5 : une ligne par nom, fieldset et legend, sans violation axe', async () => {
    const { container } = rendre({ mode: 'reprise', reponses: { q1: { valeur: 'souvent' } }, etape: 'q5' });
    const groupes = container.querySelectorAll('fieldset fieldset');
    expect(groupes).toHaveLength(7);
    expect([...groupes].map((g) => g.querySelector('legend')!.textContent)).toContain('La question du jour');
    expect(container.querySelectorAll('input[type=radio]:checked')).toHaveLength(0);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Q5 néerlandais : cinq noms, ni Stuut ni Signal', () => {
    const { container } = rendre({ mode: 'reprise', reponses: { q1: { valeur: 'souvent' } }, etape: 'q5' }, 'nl');
    const noms = [...container.querySelectorAll('fieldset fieldset legend')].map((l) => l.textContent);
    expect(noms).toEqual(['Het magazine', 'Amai !', 'De quiz', 'De vraag van de dag', 'De radar']);
    expect(container.textContent).not.toMatch(/Stuut|Signal/);
  });

  it('Q9 « oui » : deux champs étiquetés, autocomplete et inputmode, aide liée, sans violation axe', async () => {
    const { container } = rendre({ mode: 'reprise', reponses: { q1: { valeur: 'jamais' } }, etape: 'q9' });
    fireEvent.click(screen.getByLabelText('oui'));
    const email = screen.getByLabelText('Votre adresse e-mail');
    const tel = screen.getByLabelText('Votre numéro de téléphone');
    expect([email.getAttribute('type'), email.getAttribute('autocomplete'), email.getAttribute('inputmode')]).toEqual([
      'email',
      'email',
      'email',
    ]);
    expect([tel.getAttribute('type'), tel.getAttribute('autocomplete'), tel.getAttribute('inputmode')]).toEqual([
      'tel',
      'tel',
      'tel',
    ]);
    const idAide = screen.getByText(/seules données personnelles/).id;
    expect(idAide).toBeTruthy();
    expect(email.getAttribute('aria-describedby')).toContain(idAide);
    expect(tel.getAttribute('aria-describedby')).toContain(idAide);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Q9 « oui » sans aucune coordonnée : erreur liée aux deux champs, rien n’est envoyé', async () => {
    rendre({ mode: 'reprise', reponses: { q1: { valeur: 'jamais' } }, etape: 'q9' });
    fireEvent.click(screen.getByLabelText('oui'));
    suivant();
    const erreur = await screen.findByText(/Indiquez une adresse e-mail ou un numéro de téléphone/);
    const idErreur = erreur.closest('p')!.id;
    expect(screen.getByRole('status').contains(erreur)).toBe(true);
    for (const libelle of ['Votre adresse e-mail', 'Votre numéro de téléphone']) {
      const champ = screen.getByLabelText(libelle);
      expect(champ.getAttribute('aria-invalid')).toBe('true');
      expect(champ.getAttribute('aria-describedby')).toContain(idErreur);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('Q9 « oui », téléphone invalide : erreur liée au seul champ téléphone', async () => {
    rendre({ mode: 'reprise', reponses: { q1: { valeur: 'jamais' } }, etape: 'q9' });
    fireEvent.click(screen.getByLabelText('oui'));
    fireEvent.change(screen.getByLabelText('Votre numéro de téléphone'), { target: { value: '0470 ABC' } });
    suivant();
    const erreur = await screen.findByText(/Numéro de téléphone invalide/);
    const idErreur = erreur.closest('p')!.id;
    expect(screen.getByLabelText('Votre numéro de téléphone').getAttribute('aria-describedby')).toContain(idErreur);
    expect(screen.getByLabelText('Votre adresse e-mail').getAttribute('aria-invalid')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('Q9 « oui », téléphone seul : envoyé sans champ email', async () => {
    rendre({ mode: 'reprise', reponses: { q1: { valeur: 'jamais' } }, etape: 'q9' });
    fireEvent.click(screen.getByLabelText('oui'));
    fireEvent.change(screen.getByLabelText('Votre numéro de téléphone'), { target: { value: ' 0470 12 34 56 ' } });
    suivant();
    await titreActif(/Merci, vos réponses sont enregistrées/);
    expect(recus.at(-1)).toEqual({ etape: 'q9', reponse: { valeur: 'oui', telephone: '0470 12 34 56' }, site: '' });
  });

  it('néerlandais : textes traduits', () => {
    rendre({ mode: 'accueil' }, 'nl');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Tien vragen over de digest');
    expect(screen.getByRole('button', { name: 'Beginnen' })).toBeTruthy();
  });

  it('écran verrouillé : « déjà répondu », sans formulaire', () => {
    const { container } = rendre({ mode: 'termine' });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Vous avez déjà répondu, merci.');
    expect(container.querySelector('form')).toBeNull();
  });
});

describe('Sondage : mesure d’audience sans contenu', () => {
  it('parcours complet : aucun événement Umami ne porte une réponse', async () => {
    rendre();
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    await titreActif(/En général/);
    fireEvent.click(screen.getByLabelText('jamais'));
    suivant();
    await titreActif(/empêche/);
    fireEvent.click(screen.getByLabelText('autre'));
    fireEvent.change(screen.getByLabelText('Précisez (facultatif)'), { target: { value: 'TEMOIN-AUTRE' } });
    suivant();
    await titreActif(/ne changions qu/);
    fireEvent.click(screen.getByLabelText('plus court'));
    suivant();
    await titreActif(/changer une seule chose/);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'TEMOIN-VERBATIM' } });
    fireEvent.click(screen.getByLabelText('oui'));
    suivant();
    await titreActif(/échange de quinze minutes/);
    fireEvent.click(screen.getByLabelText('oui'));
    fireEvent.change(screen.getByLabelText('Votre adresse e-mail'), { target: { value: 'temoin@example.org' } });
    suivant();
    await titreActif(/Merci, vos réponses sont enregistrées/);

    const noms = umami.mock.calls.map((c) => c[0]);
    expect(noms[0]).toBe('sondage_commence');
    expect(noms.at(-1)).toBe('sondage_termine');
    expect(noms.filter((n) => n === 'sondage_etape')).toHaveLength(5);
    const tout = JSON.stringify(umami.mock.calls);
    for (const temoin of ['TEMOIN', 'example.org', 'jamais', 'plus_court', 'autre', '"oui"']) {
      expect(tout).not.toContain(temoin);
    }
    // Les réponses, elles, sont bien parties vers la route (et seulement vers elle).
    expect(JSON.stringify(recus)).toContain('TEMOIN-VERBATIM');
    expect(recus.at(-1)).toMatchObject({ etape: 'q9', reponse: { valeur: 'oui', email: 'temoin@example.org' } });
  });
});
