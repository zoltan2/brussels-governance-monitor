// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { PLAFOND_MODULE_SERVEUR, donneesAutonomesManquantes, modulesServeurTropLourds } from './controle-donnees-build';

const Mo = 1024 * 1024;

describe('donneesAutonomesManquantes', () => {
  const source = [
    { nom: 'domainCards.json', octets: 5_800_000 },
    { nom: 'dossierCards.json', octets: 6_900_000 },
  ];

  it('passe quand la sortie autonome porte chaque fichier, à la même taille', () => {
    expect(donneesAutonomesManquantes(source, [...source])).toEqual([]);
  });

  it('nomme le fichier absent de la sortie autonome', () => {
    expect(donneesAutonomesManquantes(source, [source[0]])).toEqual([
      'dossierCards.json : absent de la sortie autonome',
    ]);
  });

  it('nomme le fichier dont la copie est tronquée ou périmée', () => {
    const copie = [source[0], { nom: 'dossierCards.json', octets: 12 }];
    expect(donneesAutonomesManquantes(source, copie)).toEqual([
      'dossierCards.json : 12 octets dans la sortie autonome, 6900000 dans .velite/',
    ]);
  });

  it('borne basse : aucun fichier dans .velite/ est une panne, pas un succès', () => {
    expect(donneesAutonomesManquantes([], [])).toEqual(['.velite/ ne contient aucune collection']);
  });
});

describe('modulesServeurTropLourds', () => {
  it('passe sous le plafond', () => {
    expect(modulesServeurTropLourds([{ chemin: 'chunks/ssr/a.js', octets: 2 * Mo }])).toEqual([]);
  });

  it('nomme chaque module au-dessus du plafond, le plus lourd en tête (cas du 01/10/2026 : 20 Mo)', () => {
    const lourds = modulesServeurTropLourds([
      { chemin: 'chunks/b.js', octets: 19.9 * Mo },
      { chemin: 'chunks/ssr/a.js', octets: 20 * Mo },
      { chemin: 'chunks/ssr/c.js', octets: 1.8 * Mo },
    ]);
    expect(lourds).toEqual(['chunks/ssr/a.js : 20.0 Mo', 'chunks/b.js : 19.9 Mo']);
  });

  it('le plafond laisse passer les modules actuels et arrête un jeu de données embarqué', () => {
    expect(PLAFOND_MODULE_SERVEUR).toBeGreaterThanOrEqual(4 * Mo);
    expect(PLAFOND_MODULE_SERVEUR).toBeLessThanOrEqual(10 * Mo);
  });
});
