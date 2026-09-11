#!/usr/bin/env node
/**
 * Génère l'index Pagefind et remplace public/pagefind/ par exactement ce qui
 * vient d'être généré.
 *
 * Pourquoi : Pagefind n'efface jamais son dossier de sortie, et nomme ses
 * fragments par empreinte de contenu. Chaque build ajoutait donc de nouveaux
 * fichiers sans retirer les anciens. Le 2026-09-11, 994 fichiers sur 2 064
 * n'étaient plus référencés par aucun index, servis en ligne et embarqués dans
 * chaque image Docker. Un banc de recherche réel (36 requêtes, 4 langues,
 * 1 647 résultats) a donné des résultats identiques avec et sans eux (PR #460).
 *
 * Pourquoi pas un `rm -rf` avant Pagefind : si la génération échouait ensuite,
 * il n'y aurait plus d'index. Ici, l'index est généré à part, validé, et
 * public/pagefind/ n'est touché qu'ensuite. Un index frais anormal laisse
 * l'ancien intact et fait échouer le build.
 *
 * Deux gardes contre un index anormal :
 * - un plancher absolu, par langue du site. Depuis la PR #461, public/pagefind/
 *   n'est plus suivi par git : l'image Docker part d'un dossier vide, et la
 *   comparaison avec l'index précédent ne s'y applique jamais. Le plancher, lui,
 *   s'applique partout, y compris au build de production.
 * - un ratio par rapport à l'index en place, quand il existe (poste local).
 *
 * Ordre d'écriture : fichiers nouveaux ou modifiés d'abord, pagefind-entry.json
 * en dernier, fichiers périmés retirés seulement ensuite. Les fragments sont
 * nommés par empreinte : tant que l'ancienne entrée est en place, tout ce
 * qu'elle référence existe encore. Un arrêt en cours de route laisse donc un
 * index cohérent, l'ancien ou le nouveau.
 *
 * Usage : appelé par `npm run build`, après `next build`.
 * PAGEFIND_ALLOW_SHRINK=1 lève les deux gardes (suppression massive de pages
 * voulue).
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const SITE = path.join(REPO, '.next', 'server', 'app');
const PUBLIC = path.join(REPO, 'public');
const TARGET = path.join(PUBLIC, 'pagefind');
const ENTRY = 'pagefind-entry.json';
const PAGEFIND_BIN = path.join(REPO, 'node_modules', '.bin', 'pagefind');
/** Langues du site : chacune doit figurer dans l'index. */
const SITE_LANGUAGES = ['fr', 'nl', 'en', 'de'];
/**
 * Pages minimales par langue. Mesure du 2026-09-11 : fr 146, nl 144, de 144,
 * en 478 (les archives du digest déclarent toutes lang="en"). Un build qui ne
 * rend qu'une partie des routes tombe bien en dessous.
 */
const MIN_PAGES_PER_LANGUAGE = 100;
/** En dessous de cette part des pages actuelles, l'index frais est jugé anormal. */
const MIN_PAGE_RATIO = 0.5;
const ALLOW_SHRINK = process.env.PAGEFIND_ALLOW_SHRINK === '1';

class BuildError extends Error {}

function fail(message) {
  throw new BuildError(message);
}

/** Refuse tout lien symbolique : une copie à travers un lien écrirait hors du dépôt. */
function listFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, entry.name);
      if (entry.isSymbolicLink()) fail(`lien symbolique refusé : ${abs}`);
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile()) out.push(path.relative(dir, abs));
      else fail(`entrée inattendue (ni fichier ni dossier) : ${abs}`);
    }
  };
  walk(dir);
  return out.sort();
}

function pagesByLanguage(entryPath) {
  const entry = JSON.parse(fs.readFileSync(entryPath, 'utf8'));
  const out = {};
  for (const [lang, info] of Object.entries(entry.languages ?? {})) out[lang] = Number(info.page_count) || 0;
  return out;
}

const total = (byLang) => Object.values(byLang).reduce((n, c) => n + c, 0);

/**
 * Garde de confinement : ce script ne supprime que dans public/pagefind/ du
 * dépôt, sans lien symbolique sur le chemin.
 */
function assertTargetContained() {
  for (const p of [PUBLIC, TARGET]) {
    if (!fs.existsSync(p)) continue;
    if (fs.lstatSync(p).isSymbolicLink()) fail(`${p} est un lien symbolique.`);
    if (fs.realpathSync(p) !== p) fail(`${p} ne se résout pas sur lui-même.`);
  }
  if (!TARGET.startsWith(PUBLIC + path.sep)) fail(`cible inattendue ${TARGET}`);
}

function validateFresh(fresh) {
  const freshEntry = path.join(fresh, ENTRY);
  if (!fs.existsSync(freshEntry)) fail(`${ENTRY} absent de la sortie.`);
  if (!fs.existsSync(path.join(fresh, 'pagefind.js'))) fail('pagefind.js absent de la sortie.');
  const byLang = pagesByLanguage(freshEntry);
  if (total(byLang) === 0) fail("l'index frais ne contient aucune page.");
  if (ALLOW_SHRINK) return byLang;

  const short = SITE_LANGUAGES.filter((l) => (byLang[l] ?? 0) < MIN_PAGES_PER_LANGUAGE);
  if (short.length > 0) {
    const detail = short.map((l) => `${l} ${byLang[l] ?? 0}`).join(', ');
    fail(
      `pages insuffisantes pour ${detail} (plancher ${MIN_PAGES_PER_LANGUAGE} par langue). ` +
        'Build probablement incomplet. PAGEFIND_ALLOW_SHRINK=1 si la réduction est voulue.',
    );
  }

  const currentEntry = path.join(TARGET, ENTRY);
  if (fs.existsSync(currentEntry)) {
    const currentPages = total(pagesByLanguage(currentEntry));
    if (total(byLang) < currentPages * MIN_PAGE_RATIO) {
      fail(
        `index frais de ${total(byLang)} pages contre ${currentPages} actuellement. ` +
          'Build probablement incomplet. PAGEFIND_ALLOW_SHRINK=1 si la réduction est voulue.',
      );
    }
  }
  return byLang;
}

function sync(fresh) {
  const keep = listFiles(fresh);
  const keepSet = new Set(keep);
  const existing = listFiles(TARGET);
  fs.mkdirSync(TARGET, { recursive: true });

  let written = 0;
  const copy = (rel) => {
    const src = path.join(fresh, rel);
    const dst = path.join(TARGET, rel);
    if (fs.existsSync(dst) && fs.readFileSync(src).equals(fs.readFileSync(dst))) return;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    written++;
  };
  // 1. Tout sauf l'entrée : l'ancienne entrée ne référence encore que des fichiers présents.
  for (const rel of keep) if (rel !== ENTRY) copy(rel);
  // 2. L'entrée, qui bascule l'index.
  copy(ENTRY);
  // 3. Seulement maintenant, les fichiers que plus rien ne référence.
  let removed = 0;
  for (const rel of existing) {
    if (keepSet.has(rel)) continue;
    fs.rmSync(path.join(TARGET, rel));
    removed++;
  }
  // 4. Dossiers devenus vides (du plus profond au plus haut).
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
  return { files: keep.length, written, removed };
}

function main() {
  assertTargetContained();
  if (!fs.existsSync(SITE)) fail(`${SITE} introuvable : lancer next build avant.`);

  const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'pagefind-'));
  try {
    const run = spawnSync(PAGEFIND_BIN, ['--site', SITE, '--output-path', fresh], { stdio: 'inherit' });
    if (run.status !== 0) fail(`pagefind a échoué (${run.error ? run.error.message : `code ${run.status}`}).`);
    const byLang = validateFresh(fresh);
    const { files, written, removed } = sync(fresh);
    const detail = Object.entries(byLang)
      .map(([l, c]) => `${l} ${c}`)
      .join(', ');
    console.log(
      `pagefind-build : ${files} fichier(s) dans l'index (${total(byLang)} pages : ${detail}), ` +
        `${written} écrit(s), ${removed} périmé(s) retiré(s).`,
    );
  } finally {
    fs.rmSync(fresh, { recursive: true, force: true });
  }
}

try {
  main();
} catch (err) {
  if (!(err instanceof BuildError)) throw err;
  console.error(`pagefind-build : ERREUR : ${err.message}`);
  console.error('pagefind-build : public/pagefind/ laissé intact.');
  process.exitCode = 1;
}
