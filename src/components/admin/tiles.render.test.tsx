// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Les tuiles sont des composants serveur asynchrones, donc de simples
 * fonctions qui renvoient du JSX : on peut les appeler puis rendre le
 * résultat. Ces tests couvrent ce que la recette manuelle ne peut pas
 * couvrir facilement, à savoir le mode dégradé de chaque source.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/umami', () => ({ getUmamiSummary: vi.fn() }));
vi.mock('@/lib/infra-status', () => ({ readInfraStatus: vi.fn() }));
vi.mock('@/lib/resend', () => ({ listActiveContacts: vi.fn() }));
vi.mock('@/lib/refonte-votes', () => ({ getVoteStats: vi.fn() }));

import { getUmamiSummary } from '@/lib/umami';
import { readInfraStatus } from '@/lib/infra-status';
import { listActiveContacts } from '@/lib/resend';
import { getVoteStats } from '@/lib/refonte-votes';
import { TrafficTile } from './traffic-tile';
import { InfraTile } from './infra-tile';
import { SubscribersTile } from './subscribers-tile';
import { RefonteTile } from './refonte-tile';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TrafficTile', () => {
  it('affiche les chiffres quand Umami répond', async () => {
    vi.mocked(getUmamiSummary).mockResolvedValue({
      visitors: 4415,
      pageviews: 15171,
      topPages: [{ path: '/fr', views: 900 }],
    });
    render(await TrafficTile());
    expect(screen.getByText('4415')).toBeDefined();
    expect(screen.getByText('/fr')).toBeDefined();
  });

  it('affiche « Indisponible » quand Umami ne répond pas', async () => {
    vi.mocked(getUmamiSummary).mockResolvedValue(null);
    render(await TrafficTile());
    expect(screen.getByText(/Indisponible/)).toBeDefined();
  });
});

describe('InfraTile', () => {
  it('affiche « Indisponible » sans fichier d\'état', async () => {
    vi.mocked(readInfraStatus).mockResolvedValue(null);
    render(await InfraTile());
    expect(screen.getByText(/Indisponible/)).toBeDefined();
  });

  it('rend les trois lignes quand l\'état est présent', async () => {
    vi.mocked(readInfraStatus).mockResolvedValue({
      lastDeployAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
      lastDeployStatus: 'ok',
      lastBackupAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
      diskUsagePercent: 42,
      snapshotCount: 28,
    });
    render(await InfraTile());
    expect(screen.getByText('il y a 3 h (déploiement sain)')).toBeDefined();
    expect(screen.getByText('il y a 2 h (28 snapshots)')).toBeDefined();
    expect(screen.getByText('42 %')).toBeDefined();
  });
});

describe('SubscribersTile', () => {
  it('accorde le libellé au singulier', async () => {
    vi.mocked(listActiveContacts).mockResolvedValue([
      { id: '1', email: 'a@b.c', locale: 'fr', topics: [], sources: [] },
    ]);
    render(await SubscribersTile());
    expect(screen.getByText('abonné actif')).toBeDefined();
  });

  it('affiche « Indisponible » quand Resend lève', async () => {
    vi.mocked(listActiveContacts).mockRejectedValue(new Error('boom'));
    render(await SubscribersTile());
    expect(screen.getByText(/Indisponible/)).toBeDefined();
  });
});

describe('RefonteTile', () => {
  it('distingue l\'absence de stockage d\'une panne', async () => {
    vi.mocked(getVoteStats).mockResolvedValue({
      total: 0,
      recent: [],
      breakdown: {},
      storeConfigured: false,
    });
    render(await RefonteTile({ locale: 'fr' }));
    expect(screen.getByText(/Aucun stockage configuré/)).toBeDefined();
  });

  it('affiche le total quand le stockage répond', async () => {
    vi.mocked(getVoteStats).mockResolvedValue({
      total: 16,
      recent: [],
      breakdown: {},
      storeConfigured: true,
    });
    render(await RefonteTile({ locale: 'fr' }));
    expect(screen.getByText('16')).toBeDefined();
    expect(screen.getByText('votes')).toBeDefined();
  });
});
