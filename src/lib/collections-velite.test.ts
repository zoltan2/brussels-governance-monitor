// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Chaque test travaille dans un faux dossier de projet : `process.cwd()` y pointe,
// et le module est réimporté pour repartir d'une instance neuve, comme le font les
// deux couches du bundle serveur (pages et routes) qui embarquent chacune la leur.
let projet: string;
const CLE_CACHE = Symbol.for('bgm.collections-velite');

function ecrire(nom: string, donnees: unknown): string {
  const fichier = path.join(projet, '.velite', `${nom}.json`);
  fs.writeFileSync(fichier, JSON.stringify(donnees));
  return fichier;
}

async function charger() {
  vi.resetModules();
  return import('./collections-velite');
}

beforeEach(() => {
  projet = fs.mkdtempSync(path.join(os.tmpdir(), 'bgm-collections-'));
  fs.mkdirSync(path.join(projet, '.velite'));
  vi.spyOn(process, 'cwd').mockReturnValue(projet);
  delete (globalThis as Record<symbol, unknown>)[CLE_CACHE];
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  fs.rmSync(projet, { recursive: true });
});

describe('collectionsVelite', () => {
  it('lit chaque collection dans .velite/<nom>.json du dossier courant', async () => {
    ecrire('domainCards', [{ slug: 'budget' }]);
    ecrire('dossierCards', [{ slug: 'survol' }, { slug: 'metro-3' }]);
    const { collectionsVelite } = await charger();
    const c = collectionsVelite<{ domainCards: { slug: string }[]; dossierCards: { slug: string }[] }>([
      'domainCards',
      'dossierCards',
    ]);
    expect(c.domainCards).toEqual([{ slug: 'budget' }]);
    expect(c.dossierCards.map((d) => d.slug)).toEqual(['survol', 'metro-3']);
  });

  it("ne lit que les collections demandées : les autres ne sont jamais ouvertes", async () => {
    ecrire('domainCards', [{ slug: 'budget' }]);
    ecrire('dossierCards', [{ slug: 'survol' }]);
    const lecture = vi.spyOn(fs, 'readFileSync');
    const { collectionsVelite } = await charger();
    const { domainCards } = collectionsVelite<{ domainCards: unknown[]; dossierCards: unknown[] }>([
      'domainCards',
      'dossierCards',
    ]);
    expect(domainCards).toHaveLength(1);
    const lus = lecture.mock.calls.map((a) => path.basename(String(a[0])));
    expect(lus).toEqual(['domainCards.json']);
  });

  it('en production, deux instances du module partagent la même copie décodée, lue une seule fois', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    ecrire('domainCards', [{ slug: 'budget' }]);
    const lecture = vi.spyOn(fs, 'readFileSync');

    const pages = (await charger()).collectionsVelite<{ domainCards: unknown[] }>(['domainCards']);
    const routes = (await charger()).collectionsVelite<{ domainCards: unknown[] }>(['domainCards']);

    expect(pages).not.toBe(routes); // témoin : ce sont bien deux instances
    expect(routes.domainCards).toBe(pages.domainCards); // même tableau, pas une seconde copie
    expect(pages.domainCards).toBe(pages.domainCards);
    expect(lecture.mock.calls.filter((a) => String(a[0]).endsWith('domainCards.json'))).toHaveLength(1);
  });

  it('en production, une collection absente est une panne, pas une liste vide', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { collectionsVelite } = await charger();
    const c = collectionsVelite<{ dossierCards: unknown[] }>(['dossierCards']);
    expect(() => c.dossierCards).toThrow(/dossierCards\.json/);
  });

  it('hors production, une collection absente rend une liste vide (tests lancés avant le build)', async () => {
    const { collectionsVelite } = await charger();
    const c = collectionsVelite<{ dossierCards: unknown[] }>(['dossierCards']);
    expect(c.dossierCards).toEqual([]);
  });

  it("un fichier qui n'est pas un tableau JSON est refusé, dans tous les environnements", async () => {
    const { collectionsVelite } = await charger();
    fs.writeFileSync(path.join(projet, '.velite', 'domainCards.json'), '{"slug":"budget"}');
    expect(() => collectionsVelite<{ domainCards: unknown[] }>(['domainCards']).domainCards).toThrow(/tableau/);
    fs.writeFileSync(path.join(projet, '.velite', 'dossierCards.json'), '[{"slug":');
    expect(() => collectionsVelite<{ dossierCards: unknown[] }>(['dossierCards']).dossierCards).toThrow(/dossierCards\.json/);
  });

  it('hors production, un fichier régénéré par Velite est relu (next dev)', async () => {
    const fichier = ecrire('domainCards', [{ slug: 'budget' }]);
    const { collectionsVelite } = await charger();
    const c = collectionsVelite<{ domainCards: { slug: string }[] }>(['domainCards']);
    expect(c.domainCards[0].slug).toBe('budget');

    ecrire('domainCards', [{ slug: 'mobilite' }]);
    // Date de modification forcée : deux écritures dans la même milliseconde seraient indiscernables.
    fs.utimesSync(fichier, new Date(), new Date(Date.now() + 5000));
    expect(c.domainCards[0].slug).toBe('mobilite');
  });

  it("en production, le fichier n'est plus consulté après la première lecture", async () => {
    vi.stubEnv('NODE_ENV', 'production');
    ecrire('domainCards', [{ slug: 'budget' }]);
    const { collectionsVelite } = await charger();
    const c = collectionsVelite<{ domainCards: { slug: string }[] }>(['domainCards']);
    expect(c.domainCards[0].slug).toBe('budget');
    const consultation = vi.spyOn(fs, 'statSync');
    const lecture = vi.spyOn(fs, 'readFileSync');
    expect(c.domainCards[0].slug).toBe('budget');
    expect(consultation).not.toHaveBeenCalled();
    expect(lecture).not.toHaveBeenCalled();
  });
});
