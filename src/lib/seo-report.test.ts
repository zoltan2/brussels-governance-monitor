// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('node:fs/promises', () => ({ readFile: vi.fn() }));

import { readFile } from 'node:fs/promises';
import { readSeoReport } from './seo-report';

beforeAll(() => {
  // Meme mecanisme que traffic-status.ts : le repertoire est deduit de
  // DB_PATH. En dehors du VPS (dev local, CI) la variable est absente ;
  // ici on la fixe pour exercer le chemin de lecture avec fs mocke.
  process.env.DB_PATH = '/opt/bgm/data/db.sqlite';
});

describe('readSeoReport', () => {
  it("refuse un schéma inconnu au lieu d'afficher des zéros", async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({ schemaVersion: 99, status: 'ok', donnees: {} }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.status).toBe('format-inconnu');
    expect(rapport.blocs.gsc.donnees).toBeNull();
  });

  it('traite un fichier absent comme une panne, pas comme un rapport vide', async () => {
    vi.mocked(readFile).mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );
    expect((await readSeoReport()).blocs.umami.status).toBe('absent');
  });

  it('rejette NaN et Infinity rendus en chaîne par Postgres', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { visites: 'NaN', profondeur: 'Infinity' },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.umami.donnees?.visites).toBeNull();
    expect(rapport.blocs.umami.donnees?.profondeur).toBeNull();
  });

  it('rend un statut inconnu illisible plutôt que de le propager', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({ schemaVersion: 1, status: 'en-cours', donnees: {} }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.crawl.status).toBe('format-inconnu');
  });

  it('rend un bloc technique bloqué lisible sans planter (donnees: null)', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        status: 'blocked',
        message: 'sonde bloquée par Cloudflare',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: null,
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.crawl.status).toBe('blocked');
    expect(rapport.blocs.crawl.donnees).toBeNull();
    expect(rapport.blocs.crawl.message).toBe('sonde bloquée par Cloudflare');
  });

  it('écarte une action suggérée incomplète plutôt que d\'afficher un trou', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {
          actions: [
            { regle: 'page-en-erreur', url: '/fr/x', preuve: 'statut HTTP 500' },
            { regle: 'sans-url', preuve: 'incomplete' },
          ],
        },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.donnees?.actions).toHaveLength(1);
    expect(rapport.blocs.gsc.donnees?.actions[0].regle).toBe('page-en-erreur');
  });

  it('calcule la fraîcheur de chaque bloc avec le seuil de 8 jours', async () => {
    const ilYA9Jours = new Date(Date.now() - 9 * 24 * 3_600_000).toISOString();
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        status: 'ok',
        generatedAt: ilYA9Jours,
        donnees: {},
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.fraicheur.gsc?.level).toBe('stale');
  });
});
