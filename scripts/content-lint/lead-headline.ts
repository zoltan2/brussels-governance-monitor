/**
 * scripts/content-lint/lead-headline.ts
 *
 * Titre d'email et de la barre de l'accueil : la première phrase d'un
 * `changeSummary` écrit ou réécrit ne doit être ni tronquée (« … »), ni coupée
 * sur une date allemande ou dans une parenthèse. Logique et historique :
 * src/lib/lead-headline-check.ts (qui appelle la vraie `leadSplit`).
 *
 * Usage :
 *   npx tsx scripts/content-lint/lead-headline.ts <liste> <base>
 *     Vérifie les fiches listées dont le changeSummary est nouveau ou a changé
 *     par rapport à <base>. Mode CI et pré-vol, bloquant.
 *
 *   npx tsx scripts/content-lint/lead-headline.ts
 *     Audit de tout le dépôt : compte et liste la dette, ne bloque jamais.
 *
 * Un résumé ancien resté tel quel ne bloque pas : la dette se résorbe à la
 * prochaine veille qui le réécrit, on n'en crée plus.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { leadHeadlineProblem, localeOfCardFile } from '../../src/lib/lead-headline-check';
import { FrontmatterError } from '../../src/lib/frontmatter';
import { readFrontmatterScalar } from '../../src/lib/summary-freshness';
import { annotate } from './annotate';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
/** Collections qui déclarent changeSummary (velite.config.ts). */
const SCOPED_DIRS = [
  'content/domain-cards',
  'content/dossiers',
  'content/sector-cards',
  'content/commune-cards',
  'content/comparison-cards',
  'content/solution-cards',
];

const inScope = (file: string) => SCOPED_DIRS.some((d) => file.replace(/^\.\//, '').startsWith(`${d}/`));

function listAll(): string[] {
  const out: string[] = [];
  for (const dir of SCOPED_DIRS) {
    const abs = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs).sort()) if (name.endsWith('.mdx')) out.push(`${dir}/${name}`);
  }
  return out;
}

function summaryAtBase(base: string, file: string): string | null | undefined {
  try {
    const raw = execFileSync('git', ['show', `${base}:${file}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return readFrontmatterScalar(raw, 'changeSummary');
  } catch {
    return null; // fiche nouvelle
  }
}

function main(): void {
  const [list, base] = process.argv.slice(2);

  if (!list) {
    let checked = 0;
    const rows: string[] = [];
    for (const file of listAll()) {
      try {
        const cs = readFrontmatterScalar(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'), 'changeSummary');
        if (!cs) continue;
        checked++;
        const p = leadHeadlineProblem(cs, localeOfCardFile(file));
        if (p) rows.push(`  ${file}\n      ${p}`);
      } catch (err) {
        if (!(err instanceof FrontmatterError)) throw err;
        rows.push(`  ${file}\n      ${err.message}`);
      }
    }
    console.log(`Audit des titres d'email : ${rows.length} titre(s) fautif(s) sur ${checked} changeSummary.\n`);
    for (const r of rows) console.log(r);
    console.log('\nMode audit : aucune sortie en erreur. La CI ne bloque que les changeSummary nouveaux ou modifiés.');
    return;
  }

  if (!base || !fs.existsSync(list)) {
    console.error('Usage : lead-headline.ts <liste des MDX modifiés> <base git>   (sans argument : audit)');
    process.exit(1);
  }

  const files = fs.readFileSync(list, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).filter(inScope);
  const problems: string[] = [];
  let checked = 0;
  for (const file of files) {
    const abs = path.join(REPO_ROOT, file);
    if (!fs.existsSync(abs)) continue;
    try {
      const cs = readFrontmatterScalar(fs.readFileSync(abs, 'utf8'), 'changeSummary');
      if (!cs) continue;
      const before = summaryAtBase(base, file);
      if (before !== null && (before ?? '').trim() === cs.trim()) continue; // résumé inchangé
      checked++;
      const p = leadHeadlineProblem(cs, localeOfCardFile(file));
      if (p) {
        problems.push(`  ${file}\n      ${p}`);
        annotate("Titre d'email coupé", `${file} : ${p}`, file);
      }
    } catch (err) {
      if (!(err instanceof FrontmatterError)) throw err;
      problems.push(`  ${file}\n      ${err.message}`);
    }
  }

  if (problems.length === 0) {
    console.log(`OK : titre d'email sain sur ${checked} changeSummary nouveau(x) ou modifié(s).`);
    return;
  }
  console.error("FAIL : titre d'email (première phrase du changeSummary) coupé :\n");
  for (const p of problems) console.error(p);
  console.error(
    "\nCe titre est l'objet de la carte du digest envoyé aux abonnés et le texte de la barre\n" +
      "« Dernière mise à jour » de l'accueil. digestHeadline ne répare pas la barre : réécrire la\n" +
      'première phrase du changeSummary.',
  );
  process.exit(1);
}

main();
