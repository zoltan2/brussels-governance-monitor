// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Garde du bundle client : aucun module `'use client'` ne doit atteindre, par
// ses imports, le contenu Velite (`@/lib/content`, `.velite/`) ni le client
// d'envoi d'e-mails (`@/lib/resend`, paquet `resend`). Jusqu'au 24/09/2026,
// `preferences-form.tsx` importait ses listes de thèmes depuis `@/lib/resend`,
// qui importait `@/lib/content` : la page des préférences d'abonnement
// chargeait un chunk de ≈ 19 Mo contenant tout le contenu du site.
//
// Analyse statique pure : lit `src/`, suit les imports (hors `import type`,
// effacés à la compilation, et y compris `require()` et `import()`) depuis
// chaque module `'use client'`. Aucune dépendance au build ni à `.velite/`.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(__dirname, '..');
const ROOT = path.resolve(SRC, '..');
const VELITE_DIR = path.join(ROOT, '.velite');
const FORBIDDEN_MODULES = [
  path.join(SRC, 'lib', 'content.ts'),
  path.join(SRC, 'lib', 'resend.ts'),
];
/** Paquets npm serveur qui ne doivent jamais partir dans le bundle client. */
const FORBIDDEN_PACKAGES = ['resend'];
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
  for (const m of source.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
  return specs;
}

type Resolved = { kind: 'file'; path: string } | { kind: 'package'; name: string } | null;

function resolveSpec(fromFile: string, spec: string): Resolved {
  let base: string;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec === '#content' || spec.startsWith('#content/')) base = path.join(VELITE_DIR, spec.slice('#content'.length));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else {
    const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    return { kind: 'package', name };
  }
  // `.velite/` n'existe pas en CI avant le build : on le reconnaît par son chemin.
  if (base === VELITE_DIR || base.startsWith(VELITE_DIR + path.sep)) return { kind: 'file', path: base };
  const candidates = [base, ...EXTENSIONS.map((e) => base + e), ...EXTENSIONS.map((e) => path.join(base, 'index' + e))];
  const found = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  return found ? { kind: 'file', path: found } : null;
}

const files = listSourceFiles(SRC);
const sourceOf = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));
const rel = (p: string) => path.relative(ROOT, p);

function isForbidden(target: Resolved): string | null {
  if (!target) return null;
  if (target.kind === 'package') return FORBIDDEN_PACKAGES.includes(target.name) ? `paquet ${target.name}` : null;
  if (target.path === VELITE_DIR || target.path.startsWith(VELITE_DIR + path.sep)) return rel(target.path);
  return FORBIDDEN_MODULES.includes(target.path) ? rel(target.path) : null;
}

/** Premier chemin d'import de `root` vers un module interdit, ou null. */
function forbiddenChainFrom(root: string): string[] | null {
  const seen = new Map<string, string[]>([[root, [root]]]);
  const queue = [root];
  while (queue.length) {
    const file = queue.shift()!;
    const src = sourceOf.get(file) ?? fs.readFileSync(file, 'utf8');
    for (const spec of runtimeImports(src)) {
      const target = resolveSpec(file, spec);
      const hit = isForbidden(target);
      if (hit) return [...seen.get(file)!.map(rel), hit];
      if (!target || target.kind !== 'file' || seen.has(target.path) || !fs.existsSync(target.path)) continue;
      seen.set(target.path, [...seen.get(file)!, target.path]);
      queue.push(target.path);
    }
  }
  return null;
}

describe('frontière du bundle client : ni contenu Velite ni Resend', () => {
  it("l'analyse voit les modules client et les chemins interdits (témoin)", () => {
    // Sans témoin, une analyse cassée (0 module trouvé, résolution muette) passerait en silence.
    const clientModules = files.filter((f) => isClientModule(sourceOf.get(f)!));
    expect(clientModules.length).toBeGreaterThan(50);
    expect(clientModules.map(rel)).toContain('src/components/preferences-form.tsx');
    // Côté serveur, la route des préférences atteint bien Resend et le contenu.
    expect(forbiddenChainFrom(path.join(SRC, 'app', 'api', 'preferences', 'route.ts'))).not.toBeNull();
    expect(forbiddenChainFrom(path.join(SRC, 'lib', 'content.ts'))).toEqual(['src/lib/content.ts', '.velite']);
  });

  it("aucun module 'use client' n'atteint @/lib/content, .velite ou @/lib/resend", () => {
    const violations: string[] = [];
    for (const file of files) {
      if (!isClientModule(sourceOf.get(file)!)) continue;
      const chain = forbiddenChainFrom(file);
      if (chain) violations.push(chain.join(' → '));
    }
    expect(violations, `Module serveur embarqué dans le bundle client :\n${violations.join('\n')}`).toEqual([]);
  });
});
