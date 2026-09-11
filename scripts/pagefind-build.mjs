#!/usr/bin/env node
/**
 * Génère l'index Pagefind et remplace public/pagefind/ par exactement ce qui
 * vient d'être généré.
 *
 * Pourquoi : Pagefind n'efface jamais son dossier de sortie, et nomme ses
 * fragments par empreinte de contenu. Chaque build ajoutait donc de nouveaux
 * fichiers sans retirer les anciens. Le 2026-09-11, 840 fichiers sur 1 910
 * (environ 29 Mo) n'étaient plus référencés par aucun index, servis en ligne et
 * embarqués dans chaque image Docker. Un banc de recherche réel (36 requêtes,
 * 4 langues, 1 644 résultats) a donné des résultats identiques avec et sans eux.
 *
 * Pourquoi pas un `rm -rf` avant Pagefind : si la génération échouait ensuite,
 * il n'y aurait plus d'index. Ici, l'index est généré à part, validé, et
 * public/pagefind/ n'est touché qu'ensuite. Un index frais anormal laisse
 * l'ancien intact et fait échouer le build.
 *
 * Usage : appelé par `npm run build`, après `next build`.
 * PAGEFIND_ALLOW_SHRINK=1 autorise un index frais beaucoup plus petit que
 * l'actuel (suppression massive de pages voulue).
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(REPO, '.next', 'server', 'app');
const TARGET = path.join(REPO, 'public', 'pagefind');
const PAGEFIND_BIN = path.join(REPO, 'node_modules', '.bin', 'pagefind');
/** En dessous de cette part des pages actuelles, l'index frais est jugé anormal. */
const MIN_PAGE_RATIO = 0.5;

function fail(message) {
  console.error(`pagefind-build : ERREUR : ${message}`);
  console.error('pagefind-build : public/pagefind/ laissé intact.');
  process.exit(1);
}

function listFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, entry.name);
      if (entry.isDirectory()) walk(abs);
      else out.push(path.relative(dir, abs));
    }
  };
  walk(dir);
  return out.sort();
}

function totalPages(entryPath) {
  const entry = JSON.parse(fs.readFileSync(entryPath, 'utf8'));
  const languages = Object.values(entry.languages ?? {});
  return languages.reduce((n, l) => n + (Number(l.page_count) || 0), 0);
}

// Garde de confinement : ce script ne supprime que dans public/pagefind/ du dépôt.
if (!TARGET.startsWith(path.join(REPO, 'public') + path.sep)) fail(`cible inattendue ${TARGET}`);
if (!fs.existsSync(SITE)) fail(`${SITE} introuvable : lancer next build avant.`);

const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'pagefind-'));
try {
  const run = spawnSync(PAGEFIND_BIN, ['--site', SITE, '--output-path', fresh], { stdio: 'inherit' });
  if (run.status !== 0) fail(`pagefind a échoué (code ${run.status}).`);

  // Validation de l'index frais avant de toucher à quoi que ce soit.
  const freshEntry = path.join(fresh, 'pagefind-entry.json');
  if (!fs.existsSync(freshEntry)) fail('pagefind-entry.json absent de la sortie.');
  if (!fs.existsSync(path.join(fresh, 'pagefind.js'))) fail('pagefind.js absent de la sortie.');
  const freshPages = totalPages(freshEntry);
  if (freshPages === 0) fail("l'index frais ne contient aucune page.");

  const currentEntry = path.join(TARGET, 'pagefind-entry.json');
  if (fs.existsSync(currentEntry) && process.env.PAGEFIND_ALLOW_SHRINK !== '1') {
    const currentPages = totalPages(currentEntry);
    if (freshPages < currentPages * MIN_PAGE_RATIO) {
      fail(
        `index frais de ${freshPages} pages contre ${currentPages} actuellement. ` +
          'Build probablement incomplet. PAGEFIND_ALLOW_SHRINK=1 si la réduction est voulue.',
      );
    }
  }

  // Synchronisation : ajouter ou mettre à jour ce qui est produit, retirer le reste.
  const keep = new Set(listFiles(fresh));
  let removed = 0;
  let written = 0;
  fs.mkdirSync(TARGET, { recursive: true });
  for (const rel of listFiles(TARGET)) {
    if (keep.has(rel)) continue;
    fs.rmSync(path.join(TARGET, rel));
    removed++;
  }
  for (const rel of keep) {
    const src = path.join(fresh, rel);
    const dst = path.join(TARGET, rel);
    const same = fs.existsSync(dst) && fs.readFileSync(src).equals(fs.readFileSync(dst));
    if (same) continue;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    written++;
  }
  // Dossiers devenus vides après retrait (du plus profond au plus haut).
  const dirs = [];
  const collect = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const abs = path.join(d, entry.name);
        collect(abs);
        dirs.push(abs);
      }
    }
  };
  collect(TARGET);
  for (const d of dirs) if (fs.readdirSync(d).length === 0) fs.rmdirSync(d);

  console.log(
    `pagefind-build : ${keep.size} fichier(s) dans l'index (${freshPages} pages), ` +
      `${written} écrit(s), ${removed} périmé(s) retiré(s).`,
  );
} finally {
  fs.rmSync(fresh, { recursive: true, force: true });
}
