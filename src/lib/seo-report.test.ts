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
        bloc: 'umami',
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
      JSON.stringify({ schemaVersion: 1, bloc: 'crawl', status: 'en-cours', donnees: {} }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.crawl.status).toBe('format-inconnu');
  });

  it('rend un bloc technique bloqué lisible sans planter (donnees: null)', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'crawl',
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

  it('retient une action complète, dans la forme que produit regles.mjs', async () => {
    // Forme réelle décidée après relecture : regles.mjs porte désormais un
    // `url` explicite sur chaque action (regle, priorite, titre, url,
    // preuve, fenetre), une action non cliquable ne servant à rien.
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'gsc',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {
          actions: [
            {
              regle: 'page-en-erreur',
              priorite: 1,
              titre: 'Page en erreur : /fr/x',
              url: '/fr/x',
              preuve: 'statut HTTP 500',
              fenetre: { debut: '2026-08-20', fin: '2026-09-16' },
            },
          ],
        },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.donnees?.actions).toEqual([
      {
        regle: 'page-en-erreur',
        url: '/fr/x',
        preuve: 'statut HTTP 500',
        titre: 'Page en erreur : /fr/x',
        priorite: 1,
        fenetre: { debut: '2026-08-20', fin: '2026-09-16', fuseau: null },
      },
    ]);
  });

  it("écarte une action sans url plutôt que d'afficher une tuile vide en silence", async () => {
    // Verrou de régression : si l'amont (regles.mjs) cessait un jour de
    // fournir `url`, ce test doit rougir plutôt que de laisser passer une
    // action non cliquable sans que personne ne le remarque.
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'gsc',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {
          actions: [
            {
              regle: 'page-en-erreur',
              priorite: 1,
              titre: 'Page en erreur : /fr/x',
              preuve: 'statut HTTP 500',
              fenetre: { debut: '2026-08-20', fin: '2026-09-16' },
            },
          ],
        },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.donnees?.actions).toHaveLength(0);
  });

  it('calcule la fraîcheur de chaque bloc avec le seuil de 8 jours', async () => {
    const ilYA9Jours = new Date(Date.now() - 9 * 24 * 3_600_000).toISOString();
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'gsc',
        status: 'ok',
        generatedAt: ilYA9Jours,
        donnees: {},
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.fraicheur.gsc?.level).toBe('stale');
  });

  it('expose le scriptSha256 de chaque bloc, ou null si absent', async () => {
    const empreinte = 'a'.repeat(64);
    vi.mocked(readFile).mockImplementation(async (chemin) => {
      const nom = String(chemin).includes('seo-gsc.json') ? 'gsc' : 'autre';
      return JSON.stringify({
        schemaVersion: 1,
        bloc: nom === 'gsc' ? 'gsc' : 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        // Seul le bloc GSC porte une empreinte dans ce test : le VPS peut
        // déployer un script plus vieux que le dépôt pour un seul bloc.
        scriptSha256: nom === 'gsc' ? empreinte : undefined,
        donnees: {},
      });
    });
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.scriptSha256).toBe(empreinte);
    expect(rapport.blocs.umami.scriptSha256).toBeNull();
  });

  it("rend illisible un fichier dont le champ bloc ne correspond pas, jamais de chiffres empruntés à un autre bloc", async () => {
    // seo-gsc.json et seo-crawl.json contiennent tous deux un bloc qui se
    // déclare "umami" (fichiers mélangés, script en panne à mi-écriture) :
    // ni l'un ni l'autre ne doit être lu comme s'il portait les bons chiffres.
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { visites: 4200 },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.status).toBe('format-inconnu');
    expect(rapport.blocs.gsc.donnees).toBeNull();
    expect(rapport.blocs.crawl.status).toBe('format-inconnu');
    expect(rapport.blocs.crawl.donnees).toBeNull();
    expect(rapport.blocs.umami.status).toBe('ok');
    expect(rapport.blocs.umami.donnees?.visites).toBe(4200);
  });

  it('lit pagesEntree comme un tableau { chemin, visites, visitesIa }', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {
          pagesEntree: [
            { chemin: '/fr/dossiers/lez', visites: 420, visitesIa: 97 },
          ],
        },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.umami.donnees?.pagesEntree).toEqual([
      { chemin: '/fr/dossiers/lez', visites: 420, visitesIa: 97 },
    ]);
  });

  it("écarte une entrée de pagesEntree sans chemin, mais rend les visites null sans l'écarter si elles ne sont pas un nombre", async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {
          pagesEntree: [
            { visites: 100, visitesIa: 10 }, // pas de chemin : écartée
            { chemin: '/fr/dossiers/acs', visites: 'NaN', visitesIa: 'Infinity' },
          ],
        },
      }),
    );
    const rapport = await readSeoReport();
    const pages = rapport.blocs.umami.donnees?.pagesEntree ?? [];
    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual({ chemin: '/fr/dossiers/acs', visites: null, visitesIa: null });
  });

  it('ne plante pas quand pagesEntree est absent ou du mauvais type', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { pagesEntree: 'pas-un-tableau' },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.umami.donnees?.pagesEntree).toEqual([]);
  });

  it("rejette un evenements non entier (chaîne, décimal) au lieu d'un zéro inventé", async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { evenements: '12' },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.umami.donnees?.evenements).toBeNull();
  });

  it("rejette un evenements decimal, un comptage n'étant jamais une fraction", async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { evenements: 4.5 },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.umami.donnees?.evenements).toBeNull();
  });

  it('lit la fenêtre au premier niveau du bloc, avec son fuseau (contrat commun)', async () => {
    // Le contrat JSON commun (contraintes-globales.md) impose `fenetre` au
    // premier niveau de CHAQUE fichier, pas seulement dans `donnees` du
    // bloc GSC : Search Console est en heure du Pacifique, Umami en UTC.
    vi.mocked(readFile).mockImplementation(async (chemin) => {
      const nom = String(chemin).includes('seo-gsc.json') ? 'gsc' : 'umami';
      return JSON.stringify({
        schemaVersion: 1,
        bloc: nom,
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        fenetre:
          nom === 'gsc'
            ? { debut: '2026-08-24', fin: '2026-09-20', fuseau: 'America/Los_Angeles' }
            : { debut: '2026-08-24', fin: '2026-09-20', fuseau: 'UTC' },
        donnees: {},
      });
    });
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.fenetre).toEqual({
      debut: '2026-08-24',
      fin: '2026-09-20',
      fuseau: 'America/Los_Angeles',
    });
    expect(rapport.blocs.umami.fenetre).toEqual({
      debut: '2026-08-24',
      fin: '2026-09-20',
      fuseau: 'UTC',
    });
  });

  it("rend la fenêtre d'un bloc null quand elle est absente, jamais une date inventée", async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'crawl',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {},
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.crawl.fenetre).toBeNull();
  });

  it('lit la fenêtre même quand le bloc est en panne ou bloqué (elle décrit la période visée, pas le succès)', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'crawl',
        status: 'blocked',
        message: 'sonde bloquée par Cloudflare',
        generatedAt: '2026-09-21T04:30:00Z',
        fenetre: { debut: '2026-08-24', fin: '2026-09-20', fuseau: 'UTC' },
        donnees: null,
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.crawl.status).toBe('blocked');
    expect(rapport.blocs.crawl.fenetre).toEqual({
      debut: '2026-08-24',
      fin: '2026-09-20',
      fuseau: 'UTC',
    });
  });

  it('lit evenements comme un entier valide', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { evenements: 12 },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.umami.donnees?.evenements).toBe(12);
  });
});
