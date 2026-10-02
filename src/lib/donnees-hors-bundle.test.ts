// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Garde du bundle serveur : aucun module de `src/` n'importe les sorties de Velite
// (`.velite/`, alias `#content`) comme un MODULE. Un JSON importé est recopié par
// le bundler dans le code, une fois par couche (pages, routes). Jusqu'au
// 02/10/2026, `content.ts` faisait `require('../../.velite')` : deux modules
// serveur de 20 Mo, dont le seul texte source occupait 2 x 39 Mo du tas de Node,
// plus deux copies décodées. Sous un plafond de 512 Mo (259 Mo de tas), bgm-app
// s'est arrêté 41 fois en 11 h 30 le 01/10/2026. Les données se lisent désormais
// sur disque, par `src/lib/collections-velite.ts`.
//
// Analyse statique pure : ne dépend ni du build ni de `.velite/`.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(__dirname, '..');
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.mjs'];

function fichiersSource(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return fichiersSource(p);
    if (!EXTENSIONS.includes(path.extname(e.name))) return [];
    if (/\.(test|spec)\.[jt]sx?$/.test(e.name)) return [];
    return [p];
  });
}

/** Spécificateurs importés à l'exécution (`import type` exclu, `require()` et `import()` compris). */
function importsALExecution(brut: string): string[] {
  // Les commentaires citent volontiers l'ancien `require('../../.velite')` : on les retire.
  const source = brut.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const specs: string[] = [];
  for (const m of source.matchAll(/^\s*(?:import|export)\s+(?!type\s)[\s\S]*?\s+from\s+['"]([^'"]+)['"]/gm)) specs.push(m[1]);
  for (const m of source.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)) specs.push(m[1]);
  for (const m of source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
  for (const m of source.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
  return specs;
}

const viseVelite = (spec: string) =>
  spec === '#content' || spec.startsWith('#content/') || /(^|\/)\.velite(\/|$)/.test(spec);

describe('les sorties de Velite ne sont jamais importées comme module', () => {
  it("l'analyse reconnaît les formes d'import visées (témoin)", () => {
    const formes = [
      "return require('../../.velite') as unknown as VeliteCollections;",
      "import { dossierCards } from '#content';",
      "import cartes from '../../.velite/dossierCards.json';",
      "const m = await import('#content/dossierCards.json');",
    ];
    for (const forme of formes) expect(importsALExecution(forme).filter(viseVelite), forme).toHaveLength(1);
    // Un commentaire n'est pas un import, même s'il cite la forme interdite.
    expect(importsALExecution("// avant : require('../../.velite')").filter(viseVelite)).toEqual([]);
    expect(importsALExecution("/**\n * avant : `require('../../.velite')`\n */").filter(viseVelite)).toEqual([]);
    expect(importsALExecution("import type { X } from '#content';").filter(viseVelite)).toEqual([]);
  });

  it('aucun module de src/ ne le fait', () => {
    const fichiers = fichiersSource(SRC);
    expect(fichiers.length).toBeGreaterThan(300); // témoin : l'analyse voit le code
    const fautifs = fichiers
      .filter((f) => importsALExecution(fs.readFileSync(f, 'utf8')).some(viseVelite))
      .map((f) => path.relative(path.resolve(SRC, '..'), f));
    expect(
      fautifs,
      'Données Velite importées comme module : elles seraient recopiées dans le bundle serveur. ' +
        'Passer par src/lib/collections-velite.ts.',
    ).toEqual([]);
  });
});
