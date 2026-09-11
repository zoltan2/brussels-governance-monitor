/**
 * scripts/content-lint/change-summary-date.ts
 *
 * Pour chaque fiche modifiée, un changeSummary écrit ou réécrit doit porter
 * changeSummaryDate. Logique et historique : src/lib/change-summary-date.ts.
 *
 * Usage : npx tsx scripts/content-lint/change-summary-date.ts <liste> <base>
 *   <liste> : fichier listant les MDX modifiés, un par ligne
 *   <base>  : référence git de comparaison (origin/main)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { changeSummaryDateProblem, type ChangeSummaryFields } from '../../src/lib/change-summary-date';
import { FrontmatterError, readGuardFrontmatter } from '../../src/lib/frontmatter';
import { annotate } from './annotate';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
/** Collections dont le schéma Velite déclare changeSummaryDate (velite.config.ts). */
const SCOPED_DIRS = [
  'content/domain-cards',
  'content/dossiers',
  'content/sector-cards',
  'content/commune-cards',
  'content/comparison-cards',
  'content/solution-cards',
];

function inScope(file: string): boolean {
  const abs = path.resolve(REPO_ROOT, file);
  return SCOPED_DIRS.some((d) => abs.startsWith(path.join(REPO_ROOT, d) + path.sep));
}

function fields(raw: string): ChangeSummaryFields {
  const data = readGuardFrontmatter(raw) ?? {};
  const str = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : undefined);
  return { changeSummary: str('changeSummary'), changeSummaryDate: str('changeSummaryDate'), lastModified: str('lastModified') };
}

function atBase(base: string, file: string): string | null {
  try {
    return execFileSync('git', ['show', `${base}:${file}`], { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null; // fiche nouvelle
  }
}

function main(): void {
  const [list, base] = process.argv.slice(2);
  if (!list || !base || !fs.existsSync(list)) {
    console.error('Usage : change-summary-date.ts <liste des MDX modifiés> <base git>');
    process.exit(1);
  }
  const files = fs.readFileSync(list, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).filter(inScope);
  const problems: string[] = [];
  let checked = 0;
  for (const file of files) {
    const abs = path.resolve(REPO_ROOT, file);
    if (!fs.existsSync(abs)) continue;
    checked++;
    try {
      const before = atBase(base, file);
      const problem = changeSummaryDateProblem(before === null ? null : fields(before), fields(fs.readFileSync(abs, 'utf8')));
      if (problem) {
        problems.push(`  ${file}\n      ${problem}`);
        annotate('Résumé de mise à jour sans date', `${file} : ${problem}`, file);
      }
    } catch (err) {
      if (!(err instanceof FrontmatterError)) throw err;
      problems.push(`  ${file}\n      ${err.message}`);
    }
  }
  if (problems.length === 0) {
    console.log(`OK : changeSummaryDate présent sur ${checked} fiche(s) vérifiée(s).`);
    return;
  }
  console.error('FAIL : changeSummary sans date valable :\n');
  for (const p of problems) console.error(p);
  process.exit(1);
}

main();
