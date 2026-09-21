// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CLIENT_NAMESPACES, messagesPourLeClient } from './client-namespaces';

/**
 * La liste des espaces de noms envoyes au navigateur doit correspondre a ce que
 * les composants client demandent reellement.
 *
 * Sans ce test, ajouter `useTranslations('x')` dans un composant client sans
 * ajouter `x` a la liste produirait un `MISSING_MESSAGE` en PRODUCTION, sur la
 * page concernee. Ici, cela casse la CI.
 */

const SRC = join(process.cwd(), 'src');

function fichiersSources(dossier: string): string[] {
  const resultat: string[] = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) {
      resultat.push(...fichiersSources(chemin));
    } else if (/\.tsx?$/.test(entree) && !/\.test\.tsx?$/.test(entree)) {
      resultat.push(chemin);
    }
  }
  return resultat;
}

/** Espaces demandes par un fichier portant la directive `'use client'`. */
function espacesDemandesParLeClient(): Map<string, string[]> {
  const parEspace = new Map<string, string[]>();
  for (const chemin of fichiersSources(SRC)) {
    const source = readFileSync(chemin, 'utf8');
    // La directive doit etre en tete de fichier, pas citee dans un commentaire.
    if (!/^\s*(['"])use client\1/m.test(source.slice(0, 200))) continue;

    for (const correspondance of source.matchAll(/useTranslations\(\s*['"]([^'"]+)['"]/g)) {
      const espace = correspondance[1];
      const liste = parEspace.get(espace) ?? [];
      liste.push(chemin.replace(`${process.cwd()}/`, ''));
      parEspace.set(espace, liste);
    }
  }
  return parEspace;
}

describe('espaces de noms envoyes au navigateur', () => {
  const demandes = espacesDemandesParLeClient();

  it('trouve bien des composants client qui traduisent', () => {
    // Filet : si la detection casse, les assertions suivantes passeraient au
    // vert en ne verifiant rien.
    expect(demandes.size).toBeGreaterThanOrEqual(10);
  });

  it('couvre tout ce que les composants client demandent', () => {
    const manquants = [...demandes.entries()]
      .filter(([espace]) => !(CLIENT_NAMESPACES as readonly string[]).includes(espace))
      .map(([espace, fichiers]) => `${espace} (demande par ${fichiers.join(', ')})`);

    expect(
      manquants,
      `Espaces absents de CLIENT_NAMESPACES : ils leveront MISSING_MESSAGE dans le navigateur.`,
    ).toEqual([]);
  });

  it("n'embarque rien que personne ne demande", () => {
    const inutiles = (CLIENT_NAMESPACES as readonly string[]).filter(
      (espace) => !demandes.has(espace),
    );
    expect(inutiles, 'Espaces envoyes au navigateur sans usage client').toEqual([]);
  });

  it('ne garde que les espaces listes', () => {
    const reduit = messagesPourLeClient({ home: { a: 1 }, explainers: { b: 2 }, nav: { c: 3 } });
    expect(Object.keys(reduit).sort()).toEqual(['home', 'nav']);
  });

  it('ignore un espace absent du dictionnaire plutot que de le poser a undefined', () => {
    const reduit = messagesPourLeClient({ home: { a: 1 } });
    expect('quiz' in reduit).toBe(false);
  });
});
