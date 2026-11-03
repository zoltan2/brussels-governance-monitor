// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

process.env.DB_PATH = ':memory:';

vi.mock('@/lib/resend', () => ({ countActiveContacts: vi.fn() }));

const { countActiveContacts } = await import('@/lib/resend');
const { getDb } = await import('@/lib/db');
const { SubscribersTile } = await import('./subscribers-tile');
const { NouveauxAbonnesChart } = await import('./nouveaux-abonnes-chart');

const db = getDb()!;

beforeEach(() => {
  db.exec('DELETE FROM abonnes_mois');
  db.prepare('UPDATE abonnes_suivi SET stock_desabonnements = 8').run();
  vi.mocked(countActiveContacts).mockResolvedValue(127);
});

afterEach(cleanup);

describe('SubscribersTile avec le suivi', () => {
  it('affiche les abonnés actifs, le stock de départs et les retours', async () => {
    render(await SubscribersTile());
    expect(screen.getByText('127')).toBeDefined();
    expect(screen.getByText(/8 depuis le 29\/09\/2026/)).toBeDefined();
    expect(screen.getByText(/0 depuis le/)).toBeDefined();
    expect(screen.getByTestId('graphique-nouveaux-abonnes')).toBeDefined();
  });

  it('garde le suivi quand Resend ne répond pas', async () => {
    vi.mocked(countActiveContacts).mockResolvedValue(null);
    render(await SubscribersTile());
    expect(screen.getByText(/Indisponible/)).toBeDefined();
    expect(screen.getByText(/8 depuis le 29\/09\/2026/)).toBeDefined();
  });

  it('ne parle pas de reconstitution sans mois reconstitué', async () => {
    render(await SubscribersTile());
    expect(screen.queryByText(/encore présents uniquement/)).toBeNull();
  });
});

describe('NouveauxAbonnesChart', () => {
  const mois = [
    { mois: '2026-01', valeur: null, statut: 'reconstitue' as const },
    { mois: '2026-02', valeur: 6, statut: 'reconstitue' as const },
    { mois: '2026-03', valeur: 0, statut: 'mesure' as const },
    { mois: '2026-04', valeur: 3, statut: 'en-cours' as const },
  ];

  it('donne les valeurs aux lecteurs d’écran, sans le mois vide', () => {
    render(<NouveauxAbonnesChart mois={mois} />);
    const lignes = within(screen.getByRole('table')).getAllByRole('row');
    expect(lignes).toHaveLength(4);
    expect(lignes[1].textContent).toContain('février 2026');
    expect(lignes[1].textContent).toContain('reconstitué');
    expect(lignes[3].textContent).toContain('mois en cours');
  });

  it('dessine une barre proportionnelle, aucune pour zéro ou vide', () => {
    render(<NouveauxAbonnesChart mois={mois} />);
    const rects = screen.getByTestId('graphique-nouveaux-abonnes').querySelectorAll('rect');
    expect(rects).toHaveLength(2);
    expect(Number(rects[0].getAttribute('height'))).toBe(
      2 * Number(rects[1].getAttribute('height')),
    );
    expect(rects[0].getAttribute('class')).toContain('fill-neutral-400');
    expect(rects[1].getAttribute('class')).toContain('fill-none');
  });
});
