/**
 * scripts/content-lint/explainer-messages-date.ts
 *
 * Une page /explainers/<slug> n'a pas de frontmatter Velite : sa date de
 * dernière réécriture, servie au sitemap, vient d'une table tenue à la main
 * (EXPLAINER_LAST_MODIFIED, src/lib/explainer-dates.ts). Logique et historique
 * : src/lib/explainer-messages-date.ts.
 *
 * Ce contrôle vérifie que toute réécriture de `explainers.<clé>` dans
 * messages/{fr,en,nl,de}.json (une locale suffit à déclencher) fait aussi
 * bouger l'entrée correspondante de la table — sinon la page reste marquée
 * comme figée depuis SITE_LAUNCH_DATE (ou une date encore plus ancienne) aux
 * yeux du sitemap et donc de Google, alors qu'elle vient d'être corrigée.
 *
 * La correspondance slug → clé i18n n'est pas recopiée à la main : elle est
 * lue dans chaque src/app/[locale]/explainers/<slug>/page.tsx
 * (`useTranslations('explainers.<clé>')`), seule source de vérité du routage
 * i18n. Une route sans entrée EXPLAINER_LAST_MODIFIED reste du ressort de
 * src/lib/__tests__/explainer-dates.test.ts, pas de ce contrôle.
 *
 * Usage : npx tsx scripts/content-lint/explainer-messages-date.ts <base>
 *   <base> : référence git de comparaison (origin/main)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  explainerContentChanged,
  explainerMessagesDateProblem,
  findExplainerDateLine,
  readExplainerDateExpr,
} from '../../src/lib/explainer-messages-date';
import { annotate } from './annotate';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const EXPLAINERS_DIR = path.join(REPO_ROOT, 'src', 'app', '[locale]', 'explainers');
const DATES_TABLE = 'src/lib/explainer-dates.ts';
const LOCALES = ['fr', 'en', 'nl', 'de'] as const;

function atRef(ref: string, file: string): string | null {
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null; // fichier absent à cette révision
  }
}

function readWorkingTree(file: string): string | null {
  const abs = path.join(REPO_ROOT, file);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
}

/** slug (nom du dossier) → clé i18n lue dans son page.tsx. */
function slugToKeyMap(): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(EXPLAINERS_DIR)) return map;
  for (const slug of fs.readdirSync(EXPLAINERS_DIR).sort()) {
    const slugDir = path.join(EXPLAINERS_DIR, slug);
    const pagePath = path.join(slugDir, 'page.tsx');
    if (!fs.statSync(slugDir).isDirectory() || !fs.existsSync(pagePath)) continue;
    const src = fs.readFileSync(pagePath, 'utf8');
    const m = /useTranslations\(\s*'explainers\.([A-Za-z0-9]+)'\s*\)/.exec(src);
    if (m) map.set(slug, m[1]);
  }
  return map;
}

function explainersSubtree(json: string | null, key: string): unknown {
  if (json === null) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed?.explainers?.[key] ?? null;
  } catch {
    return null; // JSON invalide : traité comme absent, ne bloque pas ce contrôle
  }
}

function main(): void {
  const base = process.argv[2];
  if (!base) {
    console.error('Usage : explainer-messages-date.ts <base git>');
    process.exit(1);
  }

  const changedMessages = (() => {
    try {
      return execFileSync('git', ['diff', '--name-only', `${base}...HEAD`, '--', 'messages/'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      })
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  })();

  if (changedMessages.length === 0) {
    console.log('explainer-messages-date : aucun messages/*.json modifié, rien à vérifier.');
    return;
  }

  const slugToKey = slugToKeyMap();
  const tableAfter = readWorkingTree(DATES_TABLE) ?? '';
  const tableBefore = atRef(base, DATES_TABLE) ?? '';

  const problems: string[] = [];
  let checked = 0;

  for (const [slug, key] of slugToKey) {
    let contentChanged = false;
    for (const locale of LOCALES) {
      const file = `messages/${locale}.json`;
      const before = explainersSubtree(atRef(base, file), key);
      const after = explainersSubtree(readWorkingTree(file), key);
      if (explainerContentChanged(before, after)) {
        contentChanged = true;
        break;
      }
    }
    if (!contentChanged) continue;
    checked++;

    const dateBefore = readExplainerDateExpr(tableBefore, slug);
    const dateAfter = readExplainerDateExpr(tableAfter, slug);
    const problem = explainerMessagesDateProblem({ slug, key, contentChanged, dateBefore, dateAfter });
    if (!problem) continue;

    const line = findExplainerDateLine(tableAfter, slug);
    const where = line ? `${DATES_TABLE}:${line}` : DATES_TABLE;
    const fix =
      `Corriger ${where} : mettre EXPLAINER_LAST_MODIFIED['${slug}'] à la date réelle de la ` +
      `modification (celle du commit qui a touché explainers.${key} dans messages/*.json).`;
    problems.push(`  ${where}\n      ${problem}\n      ${fix}`);
    annotate(`Date d'explicatif périmée : ${slug}`, `${problem}\n${fix}`, DATES_TABLE);
  }

  if (problems.length === 0) {
    console.log(`OK : ${checked} page(s) explicative(s) modifiée(s), toutes datées à jour dans ${DATES_TABLE}.`);
    return;
  }

  console.error(`FAIL : explainers modifiés sans date à jour dans ${DATES_TABLE} :\n`);
  for (const p of problems) console.error(p);
  process.exit(1);
}

main();
