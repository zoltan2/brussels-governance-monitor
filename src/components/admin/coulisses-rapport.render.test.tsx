// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CoulissesRapport, lireRapport } from './coulisses-rapport';

afterEach(() => cleanup());

// Rapport réel du numéro 1, envoyé le 5 novembre 2026.
const RAPPORT = {
  numero: 1,
  debut: '2026-11-05T06:19:30.036Z',
  fin: '2026-11-05T06:20:51.307Z',
  envoyes: { 'fr-premier': 94, 'nl-premier': 13, 'en-premier': 7 },
  exclus: { desinscrit: 0, refus: 0, langue: 0, date: 0, recent: 16, interne: 1, deja_envoye: 0 },
  refusesParResend: 0,
  incertains: 0,
  erreurs: [],
};

describe('CoulissesRapport', () => {
  it('donne la date en heure de Bruxelles, la durée et les totaux', () => {
    render(<CoulissesRapport rapport={RAPPORT} journal={{ envoye: 114 }} />);
    expect(screen.getByRole('heading', { name: 'Rapport d’envoi du numéro 1' })).toBeDefined();
    expect(screen.getByText('Parti le jeudi 5 novembre 2026 à 7 h 19, en 1 min 21 s.')).toBeDefined();
    expect(screen.getByText('114')).toBeDefined();
    expect(screen.getByText('17')).toBeDefined();
  });

  it('range les envois par langue, dans l’ordre fr, nl, en', () => {
    const { container } = render(<CoulissesRapport rapport={RAPPORT} journal={{}} />);
    const lignes = [...container.querySelectorAll('tbody tr')].map((tr) => tr.textContent);
    expect(lignes).toEqual(['Français94', 'Nederlands13', 'English7']);
    expect(screen.getByRole('columnheader', { name: 'premier mot' })).toBeDefined();
  });

  it('dit en clair pourquoi des abonnés n’ont rien reçu, accordé au nombre', () => {
    render(<CoulissesRapport rapport={RAPPORT} journal={{ envoye: 114 }} />);
    expect(screen.getByText('16 inscrits depuis moins de 21 jours')).toBeDefined();
    expect(screen.getByText('1 adresse interne (liste d’exclusion)')).toBeDefined();
    expect(screen.getByText('Aucune erreur.')).toBeDefined();
    expect(screen.getByText('Journal d’envoi (base du serveur) : 114 envoyés.')).toBeDefined();
  });

  it('montre les erreurs et les incertains quand il y en a', () => {
    render(<CoulissesRapport rapport={{ ...RAPPORT, incertains: 2, erreurs: ['Lot 2 : délai dépassé'] }} journal={{}} />);
    expect(screen.getByText('Lot 2 : délai dépassé')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });

  it('affiche brut un rapport de forme inattendue, sans le cacher', () => {
    expect(lireRapport({ numero: 1 })).toBeNull();
    render(<CoulissesRapport rapport={{ numero: 1, autre: true }} journal={{ envoye: 3 }} />);
    expect(screen.getByText('Rapport (format inattendu, affiché brut)')).toBeDefined();
    expect(screen.getByText(/"autre": true/)).toBeDefined();
  });
});
