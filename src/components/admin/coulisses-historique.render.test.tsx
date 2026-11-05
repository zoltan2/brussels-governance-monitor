// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CoulissesHistorique, avecEcart } from './coulisses-historique';
import type { Historique } from '@/lib/coulisses/historique';

afterEach(() => cleanup());

const H: Historique = {
  rendezVous: [
    { numero: 1, mois: '2026-11', debut: '2026-11-05T06:19:30Z', abonnes: 131, bienvenues: 114, edition: null, versionBienvenue: 1, tropRecents: 16, refus: 2, rebonds: 0, plaintes: 0, incidents: 0 },
    { numero: 2, mois: '2026-12', debut: '2026-12-03T06:00:00Z', abonnes: 140, bienvenues: 12, edition: 101, versionBienvenue: 1, tropRecents: 9, refus: 1, rebonds: 1, plaintes: 1, incidents: 0 },
  ],
  versions: [{ version: 1, depuis: '2026-11', recuePar: 126, parMois: [{ mois: '2026-11', n: 114 }, { mois: '2026-12', n: 12 }], refus: 2 }],
  refusNonRattaches: 3,
  reactivations: 1,
  envoisSansEmpreinte: 114,
};

describe('CoulissesHistorique', () => {
  it('écrit l’écart au rendez-vous précédent, en nombres', () => {
    expect(avecEcart(140, 131)).toBe('140 (+9)');
    expect(avecEcart(9, 16)).toBe('9 (−7)');
    expect(avecEcart(5, 5)).toBe('5 (±0)');
    expect(avecEcart(131, undefined)).toBe('131');
    expect(avecEcart(null, 3)).toBe('–');
  });

  it('une ligne par rendez-vous, avec la version de bienvenue et l’écart', () => {
    const { container } = render(<CoulissesHistorique historique={H} />);
    const lignes = [...container.querySelectorAll('table')[0].querySelectorAll('tbody tr')].map((tr) =>
      [...tr.children].map((c) => c.textContent),
    );
    expect(lignes[0]).toEqual(['nov. 2026', '131', '114 (v1)', '–', '16', '2', '0', '0', '0']);
    expect(lignes[1]).toEqual(['déc. 2026', '140 (+9)', '12 (v1)', '101', '9 (−7)', '1', '1', '1', '0']);
  });

  it('cumule la bienvenue par version, détail par mois replié', () => {
    render(<CoulissesHistorique historique={H} />);
    expect(screen.getByRole('rowheader', { name: 'v1' })).toBeDefined();
    expect(screen.getByText('126')).toBeDefined();
    expect(screen.getByText(/nov\. 2026 114 · déc\. 2026 12/)).toBeDefined();
  });

  it('dit les refus non rattachés, les réactivations et les envois sans empreinte', () => {
    render(<CoulissesHistorique historique={H} />);
    expect(screen.getByText(/Refus non rattachés .* : 3\./)).toBeDefined();
    expect(screen.getByText(/Réactivations \(refus puis retour\) : 1\./)).toBeDefined();
    expect(screen.getByText(/114 envois encore sans empreinte/)).toBeDefined();
  });
});
