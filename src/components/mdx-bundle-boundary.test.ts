// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Garde du bundle client : les composants de dossier (`src/components/dossiers/`)
// sont rendus côté serveur par `DossierMdxContent`. Si l'un d'eux redevient
// atteignable depuis un module `'use client'` (typiquement `mdx-content.tsx`,
// utilisé par les communes, le digest, les domaines…), son code et ses
// libellés en quatre langues repartent en JS sur tout le site : c'était le cas
// jusqu'au 24/09/2026 (chunk de ≈ 60 Ko servi à ~750 pages).
//
// Analyse statique pure : lit `src/`, suit les imports (hors `import type`,
// effacés à la compilation) depuis chaque module `'use client'`, et vérifie
// qu'aucun chemin n'entre dans `src/components/dossiers/`.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(__dirname, '..');
const DOSSIERS_DIR = path.join(SRC, 'components', 'dossiers') + path.sep;
const SERVER_ONLY = [
  path.join(SRC, 'components', 'dossier-mdx-content.tsx'),
];
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.mjs'];

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return listSourceFiles(p);
    if (!EXTENSIONS.includes(path.extname(e.name))) return [];
    if (/\.(test|spec)\.[jt]sx?$/.test(e.name)) return [];
    return [p];
  });
}

function isClientModule(source: string): boolean {
  // La directive doit précéder tout code : on saute commentaires et lignes vides.
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return /^\s*['"]use client['"]/.test(withoutComments);
}

/** Spécificateurs importés à l'exécution (les `import type` sont exclus). */
function runtimeImports(source: string): string[] {
  const specs: string[] = [];
  const staticRe = /^\s*(import|export)\s+(?!type\s)([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/gm;
  for (const m of source.matchAll(staticRe)) specs.push(m[3]);
  for (const m of source.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)) specs.push(m[1]);
  for (const m of source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
  return specs;
}

function resolveSpec(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // paquet npm : hors périmètre
  const candidates = [base, ...EXTENSIONS.map((e) => base + e), ...EXTENSIONS.map((e) => path.join(base, 'index' + e))];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) ?? null;
}

const files = listSourceFiles(SRC);
const sourceOf = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));

/** Pour chaque module atteint depuis `root`, le chemin d'import qui y mène. */
function reachableFrom(root: string): Map<string, string[]> {
  const seen = new Map<string, string[]>([[root, [root]]]);
  const queue = [root];
  while (queue.length) {
    const file = queue.shift()!;
    const src = sourceOf.get(file) ?? fs.readFileSync(file, 'utf8');
    for (const spec of runtimeImports(src)) {
      const target = resolveSpec(file, spec);
      if (!target || seen.has(target)) continue;
      seen.set(target, [...seen.get(file)!, target]);
      queue.push(target);
    }
  }
  return seen;
}

const rel = (p: string) => path.relative(SRC, p);
const isDossierModule = (p: string) => p.startsWith(DOSSIERS_DIR) || SERVER_ONLY.includes(p);

describe('frontière du bundle client pour les composants de dossier', () => {
  it("l'analyse voit bien les modules client et le registre des dossiers (témoin)", () => {
    // Sans témoin, une analyse cassée (0 module trouvé) passerait en silence.
    const clientModules = files.filter((f) => isClientModule(sourceOf.get(f)!));
    expect(clientModules.map(rel)).toContain('components/mdx-content.tsx');
    const registry = path.join(DOSSIERS_DIR, 'mdx-components.ts');
    const fromServer = reachableFrom(path.join(SRC, 'components', 'dossier-mdx-content.tsx'));
    expect(fromServer.has(registry)).toBe(true);
    expect(fromServer.has(path.join(DOSSIERS_DIR, 'rechauffement', 'data', 'heat.ts'))).toBe(true);
  });

  it("aucun module 'use client' hors dossiers n'atteint un composant de dossier", () => {
    const violations: string[] = [];
    for (const file of files) {
      if (file.startsWith(DOSSIERS_DIR)) continue; // îlot client propre à un dossier : admis
      if (!isClientModule(sourceOf.get(file)!)) continue;
      for (const [target, chain] of reachableFrom(file)) {
        if (isDossierModule(target)) {
          violations.push(chain.map(rel).join(' → '));
          break;
        }
      }
    }
    expect(violations, `Composant de dossier embarqué dans le bundle client :\n${violations.join('\n')}`).toEqual([]);
  });

  it('les composants inscrits dans le registre des dossiers sont des composants serveur', () => {
    const registry = path.join(DOSSIERS_DIR, 'mdx-components.ts');
    const clientOnes = runtimeImports(sourceOf.get(registry)!)
      .map((s) => resolveSpec(registry, s))
      .filter((t): t is string => !!t && t.startsWith(DOSSIERS_DIR))
      .filter((t) => isClientModule(sourceOf.get(t)!));
    expect(clientOnes.map(rel)).toEqual([]);
  });
});
