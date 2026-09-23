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

vi.mock('@/lib/traffic-status', () => ({ readTrafficStatus: vi.fn() }));
vi.mock('@/lib/infra-status', () => ({ readInfraStatus: vi.fn() }));
vi.mock('@/lib/resend', () => ({ countActiveContacts: vi.fn() }));
vi.mock('@/lib/refonte-votes', () => ({ getVoteStats: vi.fn() }));
vi.mock('@/lib/a-relire', () => ({ chargerElementsARelire: vi.fn() }));
vi.mock('@/lib/content', () => ({ getDraftCards: vi.fn() }));

import { readTrafficStatus } from '@/lib/traffic-status';
import { readInfraStatus } from '@/lib/infra-status';
import { countActiveContacts } from '@/lib/resend';
import { getVoteStats } from '@/lib/refonte-votes';
import { chargerElementsARelire } from '@/lib/a-relire';
import { getDraftCards } from '@/lib/content';
import { TrafficTile } from './traffic-tile';
import { InfraTile } from './infra-tile';
import { SubscribersTile } from './subscribers-tile';
import { RefonteTile } from './refonte-tile';
import { ARelireTile } from './a-relire-tile';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TrafficTile', () => {
  it("affiche les chiffres de l'instantané", async () => {
    vi.mocked(readTrafficStatus).mockResolvedValue({
      generatedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
      days: 7,
      visitors: 4415,
      pageviews: 15171,
      topPages: [{ path: '/fr', views: 900 }],
    });
    render(await TrafficTile());
    expect(screen.getByText('4415')).toBeDefined();
    expect(screen.getByText('visiteurs sur 7 jours')).toBeDefined();
    expect(screen.getByText('/fr')).toBeDefined();
  });

  it("date l'instantané récent sans alarmer", async () => {
    vi.mocked(readTrafficStatus).mockResolvedValue({
      generatedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
      days: 7,
      visitors: 10,
      pageviews: 20,
      topPages: [],
    });
    render(await TrafficTile());
    expect(screen.getByText('relevé il y a 2 h')).toBeDefined();
  });

  // L'instantané est horaire : trois jours veulent dire que le timer ne tourne
  // plus. Avant le 19/09/2026 cette tuile affichait « relevé il y a 3 j » du
  // même gris que le reste.
  it('signale en ambre un instantané figé', async () => {
    vi.mocked(readTrafficStatus).mockResolvedValue({
      generatedAt: new Date(Date.now() - 3 * 24 * 3_600_000).toISOString(),
      days: 7,
      visitors: 10,
      pageviews: 20,
      topPages: [],
    });
    render(await TrafficTile());
    const line = screen.getByText('en retard : dernier relevé il y a 3 j');
    expect(line.className).toContain('text-warning-fg');
  });

  it('affiche « Indisponible » sans instantané', async () => {
    vi.mocked(readTrafficStatus).mockResolvedValue(null);
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
    vi.mocked(countActiveContacts).mockResolvedValue(1);
    render(await SubscribersTile());
    expect(screen.getByText('abonné actif')).toBeDefined();
  });

  it('affiche le total au pluriel', async () => {
    vi.mocked(countActiveContacts).mockResolvedValue(91);
    render(await SubscribersTile());
    expect(screen.getByText('91')).toBeDefined();
    expect(screen.getByText('abonnés actifs')).toBeDefined();
  });

  it('distingue une panne Resend d\'un carnet vide', async () => {
    vi.mocked(countActiveContacts).mockResolvedValue(null);
    render(await SubscribersTile());
    expect(screen.getByText(/Indisponible/)).toBeDefined();
  });

  it('affiche « Indisponible » quand Resend lève', async () => {
    vi.mocked(countActiveContacts).mockRejectedValue(new Error('boom'));
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

describe('ARelireTile', () => {
  const ELEMENTS_VIDES = { pagesIa: [], faq: [], chapeau: [] };

  it('additionne les trois listes et les brouillons dans le total', async () => {
    vi.mocked(chargerElementsARelire).mockResolvedValue({
      pagesIa: [{}, {}],
      faq: [{}],
      chapeau: [{}, {}, {}],
    } as never);
    vi.mocked(getDraftCards).mockReturnValue([{}] as never);
    render(await ARelireTile({ locale: 'fr' }));
    // 2 + 1 + 3 + 1 = 7
    expect(screen.getByText('7')).toBeDefined();
    expect(screen.getByText('éléments à relire')).toBeDefined();
  });

  it("n'invente pas un zéro pour les pages IA quand le rapport SEO est indisponible", async () => {
    vi.mocked(chargerElementsARelire).mockResolvedValue({
      pagesIa: null,
      faq: [],
      chapeau: [],
    } as never);
    vi.mocked(getDraftCards).mockReturnValue([]);
    render(await ARelireTile({ locale: 'fr' }));
    expect(screen.getByText('indisponible')).toBeDefined();
    // Le total (le grand chiffre du haut) ne doit pas confondre indisponible
    // avec zéro : il vaut 0 ici car aucune AUTRE liste n'a d'élément, pas
    // parce que pagesIa vaudrait zéro (affiché « indisponible » juste au-dessus).
    expect(screen.getByText('0', { selector: '.text-3xl' })).toBeDefined();
  });

  it('affiche « Indisponible » quand les collections de contenu ne se chargent pas', async () => {
    vi.mocked(chargerElementsARelire).mockRejectedValue(new Error('velite manquant'));
    render(await ARelireTile({ locale: 'fr' }));
    expect(screen.getByText(/Indisponible/)).toBeDefined();
  });

  it('accorde le libellé au singulier pour un seul élément', async () => {
    vi.mocked(chargerElementsARelire).mockResolvedValue(ELEMENTS_VIDES as never);
    vi.mocked(getDraftCards).mockReturnValue([{}] as never);
    render(await ARelireTile({ locale: 'fr' }));
    expect(screen.getByText('élément à relire')).toBeDefined();
  });
});
