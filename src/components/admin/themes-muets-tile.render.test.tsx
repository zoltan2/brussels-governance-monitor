// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ThemesMuetsVue } from './themes-muets-vue';
import type { InstantaneThemesMuets } from '@/lib/themes-muets';

afterEach(() => cleanup());

const INSTANTANE: InstantaneThemesMuets = {
  calculeLe: '2026-10-02T04:30:00.000Z',
  fenetreJours: 14,
  abonnes: 104,
  abonnesEnSilence: 12,
  themesMuets: [
    { theme: 'education', abonnes: 7, derniereMaj: '2026-08-01' },
    { theme: 'dossier-slrb', abonnes: 1, derniereMaj: '2026-06-01' },
    { theme: 'dossier-disparu', abonnes: 1, derniereMaj: null },
  ],
  sansEnvoiPossible: { themes: ['engagements'], abonnesSeuls: 3 },
};
const LIBELLES = { education: 'Enseignement', 'dossier-slrb': 'SLRB', engagements: 'Engagements DPR' };
const LIENS = { education: '/fr/domains/education', 'dossier-slrb': '/fr/dossiers/slrb' };

describe('ThemesMuetsVue', () => {
  it('dit combien d’abonnés ne reçoivent rien, sur combien', () => {
    render(<ThemesMuetsVue lecture={{ etat: 'frais', instantane: INSTANTANE }} libelles={LIBELLES} liens={LIENS} />);
    expect(screen.getByText('12')).toBeDefined();
    expect(screen.getByText(/abonnés sur 104 sans rien dans leurs thèmes depuis 14 jours/)).toBeDefined();
  });

  it('liste les thèmes muets avec leur libellé, leur nombre d’abonnés, leur dernière date et un lien', () => {
    const { container } = render(
      <ThemesMuetsVue lecture={{ etat: 'frais', instantane: INSTANTANE }} libelles={LIBELLES} liens={LIENS} />,
    );
    const lignes = [...container.querySelectorAll('li')].map((li) => li.textContent);
    expect(lignes[0]).toBe('Enseignement : 7 abonnés, dernière mise à jour le 1 août 2026');
    expect(lignes[1]).toBe('SLRB : 1 abonné, dernière mise à jour le 1 juin 2026');
    // Sans libellé ni fiche : la clé brute, sans lien, et une date dite inconnue.
    expect(lignes[2]).toBe('dossier-disparu : 1 abonné, aucune mise à jour connue');
    const liens = [...container.querySelectorAll('li a')].map((a) => a.getAttribute('href'));
    expect(liens).toEqual(['/fr/domains/education', '/fr/dossiers/slrb']);
  });

  it('met à part les thèmes qui ne déclenchent jamais d’envoi', () => {
    render(<ThemesMuetsVue lecture={{ etat: 'frais', instantane: INSTANTANE }} libelles={LIBELLES} liens={LIENS} />);
    expect(screen.getByText(/3 abonnés ne suivent que des thèmes sans envoi \(Engagements DPR\)/)).toBeDefined();
  });

  it('rappelle que la liste invite à vérifier, pas à publier', () => {
    render(<ThemesMuetsVue lecture={{ etat: 'frais', instantane: INSTANTANE }} libelles={LIBELLES} liens={LIENS} />);
    expect(screen.getByText('À vérifier, pas à remplir : un thème sans fait nouveau reste muet.')).toBeDefined();
  });

  it('personne en silence : le dit en clair, sans liste', () => {
    const calme = { ...INSTANTANE, abonnesEnSilence: 0, themesMuets: [], sansEnvoiPossible: { themes: [], abonnesSeuls: 0 } };
    const { container } = render(<ThemesMuetsVue lecture={{ etat: 'frais', instantane: calme }} libelles={LIBELLES} liens={LIENS} />);
    expect(screen.getByText(/Aucun thème suivi n’est resté sans mise à jour/)).toBeDefined();
    expect(container.querySelector('ul')).toBeNull();
  });

  it('instantané absent : indisponible, jamais un zéro', () => {
    const { container } = render(<ThemesMuetsVue lecture={{ etat: 'absent' }} libelles={LIBELLES} liens={LIENS} />);
    expect(container.textContent).toContain('Indisponible');
    expect(container.textContent).toContain('pas encore été calculé');
    expect(container.textContent).not.toMatch(/\b0\b/);
  });

  it('instantané périmé : affiché, avec un avertissement daté', () => {
    render(<ThemesMuetsVue lecture={{ etat: 'perime', instantane: INSTANTANE }} libelles={LIBELLES} liens={LIENS} />);
    expect(screen.getByRole('status').textContent).toContain('Calcul du 2 octobre 2026, plus à jour');
    expect(screen.getByText('12')).toBeDefined();
  });

  it('instantané frais : la date du calcul est affichée, sans avertissement', () => {
    render(<ThemesMuetsVue lecture={{ etat: 'frais', instantane: INSTANTANE }} libelles={LIBELLES} liens={LIENS} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText(/Calculé le 2 octobre 2026/)).toBeDefined();
  });

  it('n’affiche aucune adresse', () => {
    const { container } = render(
      <ThemesMuetsVue lecture={{ etat: 'frais', instantane: INSTANTANE }} libelles={LIBELLES} liens={LIENS} />,
    );
    expect(container.textContent).not.toContain('@');
  });
});
