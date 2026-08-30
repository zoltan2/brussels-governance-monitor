/**
 * scripts/content-lint/summary-freshness.ts
 *
 * Contrôle de fraîcheur du chapeau (`summary`) des fiches domaines et dossiers.
 *
 * Le `summary` est le seul champ éditorial du frontmatter que rien ne demandait
 * jamais de relire. `changeSummary` est réécrit à chaque veille, `lastModified`
 * est vérifié par la CI, `sources` aussi. Le chapeau, lui, pouvait vieillir
 * indéfiniment derrière une fiche dont tout le reste était frais. Le 2026-08-30,
 * douze des treize fiches domaines avaient un chapeau de plus de nonante jours,
 * médiane à cent-cinquante-quatre.
 *
 * Ce que ça coûte : le chapeau alimente la meta description, le JSON-LD
 * `Article`, le bouton Partager, la carte de la liste des domaines, le prompt
 * système du chatbot, l'API publique `/api/v1/cards`, et sert de repli au digest
 * quand `changeSummary` manque.
 *
 * La règle ne juge pas le texte, elle force sa relecture au moment où quelqu'un
 * republie déjà la fiche. Elle ne se déclenche donc jamais sur une fiche qu'on
 * ne touche pas.
 *
 * Usage :
 *   npx tsx scripts/content-lint/summary-freshness.ts <fichier-liste>
 *     Vérifie les fiches listées (un chemin par ligne). Mode CI.
 *
 *   npm run lint:summaries
 *     Audite toutes les fiches du dépôt et affiche un classement par âge.
 *     Mode local, ne fait jamais échouer sur les fiches non touchées.
 *
 * Sort en code 1 si au moins une fiche vérifiée est en faute.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  SUMMARY_MAX_AGE_DAYS,
  checkSummaryFreshness,
  readFrontmatterScalar,
} from '../../src/lib/summary-freshness';

/** Seules ces collections portent un champ `summary`. Vérifié le 2026-08-30. */
const SCOPED_DIRS = ['content/domain-cards', 'content/dossiers'] as const;

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function isInScope(file: string): boolean {
  const normalised = file.replace(/^\.\//, '');
  return SCOPED_DIRS.some((dir) => normalised.startsWith(`${dir}/`));
}

function listAllCards(): string[] {
  const files: string[] = [];
  for (const dir of SCOPED_DIRS) {
    const abs = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs).sort()) {
      if (name.endsWith('.mdx')) files.push(`${dir}/${name}`);
    }
  }
  return files;
}

interface Row {
  file: string;
  verdict: string;
  ageDays: number | null;
  reason: string;
}

function inspect(files: string[]): Row[] {
  const rows: Row[] = [];
  for (const file of files) {
    const abs = path.join(REPO_ROOT, file);
    if (!fs.existsSync(abs)) continue;
    const content = fs.readFileSync(abs, 'utf8');
    const result = checkSummaryFreshness({
      lastModified: readFrontmatterScalar(content, 'lastModified'),
      summaryReviewed: readFrontmatterScalar(content, 'summaryReviewed'),
    });
    rows.push({ file, verdict: result.verdict, ageDays: result.ageDays, reason: result.reason });
  }
  return rows;
}

function main(): void {
  const listPath = process.argv[2];

  // Mode audit : aucun argument, on regarde tout et on ne bloque rien.
  if (!listPath) {
    const rows = inspect(listAllCards())
      .filter((r) => r.verdict !== 'ok')
      .sort((a, b) => (b.ageDays ?? Number.MAX_SAFE_INTEGER) - (a.ageDays ?? Number.MAX_SAFE_INTEGER));

    if (rows.length === 0) {
      console.log(`OK : aucun chapeau au-delà de ${SUMMARY_MAX_AGE_DAYS} jours.`);
      return;
    }
    console.log(`${rows.length} fiche(s) à relire (limite ${SUMMARY_MAX_AGE_DAYS} jours) :\n`);
    for (const r of rows) {
      const age = r.ageDays === null ? '   ?' : String(r.ageDays).padStart(4);
      console.log(`  ${age} j  ${r.file}  [${r.verdict}]`);
    }
    console.log('\nMode audit : aucune sortie en erreur. La CI ne bloque que les fiches modifiées.');
    return;
  }

  if (!fs.existsSync(listPath)) {
    console.error(`ERREUR : liste de fichiers introuvable (${listPath}).`);
    process.exit(1);
  }

  const changed = fs
    .readFileSync(listPath, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter(isInScope);

  if (changed.length === 0) {
    console.log('Aucune fiche domaine ou dossier modifiée, rien à vérifier.');
    return;
  }

  const violations = inspect(changed).filter((r) => r.verdict !== 'ok');

  if (violations.length === 0) {
    console.log(`OK : ${changed.length} fiche(s) vérifiée(s), tous les chapeaux sont à jour.`);
    return;
  }

  console.error('FAIL : chapeau (summary) à relire dans les fiches suivantes :\n');
  for (const v of violations) {
    console.error(`  ${v.file}`);
    console.error(`      ${v.reason}`);
  }
  console.error('');
  console.error('Le champ `summary` est le chapeau permanent de la fiche : il décrit son état');
  console.error('actuel, pas la mise à jour de la semaine, qui va dans `changeSummary`.');
  console.error('Il alimente aussi la meta description, le JSON-LD, le prompt du chatbot,');
  console.error("l'API publique et le repli du digest : un chapeau périmé y devient faux.");
  console.error('');
  console.error('Relire le texte, puis passer `summaryReviewed` à la date du jour.');
  console.error("Pour une migration en masse, utiliser le label 'skip-summary-check' sur la PR.");
  process.exit(1);
}

main();
