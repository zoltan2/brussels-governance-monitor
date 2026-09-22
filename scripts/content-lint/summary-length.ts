/**
 * scripts/content-lint/summary-length.ts
 *
 * Contrôle de la longueur du chapeau (`summary`).
 *
 * Le raisonnement complet est dans `src/lib/summary-length.ts`. En deux
 * phrases : `velite.config.ts` pose `summary: s.string().max(500)` sur six
 * collections, mais Velite le signale en `info` et laisse passer. Au 22/09/2026,
 * 38 chapeaux dépassaient, jusqu'au double du maximum.
 *
 * Comme `title-length`, ce lint ne bloque jamais un chapeau qu'on ne touche
 * pas : la dette existante se résorbe au rythme des republications, et ce qui
 * est interdit, c'est d'en créer de la nouvelle.
 *
 * Pas d'échappatoire propre, comme `title-length` : le label
 * `skip-summary-check` et `SKIP_SUMMARY_CHECK=1` suspendent la RELECTURE du
 * chapeau (summary-freshness), pas sa longueur. Un chapeau trop long ne devient
 * pas acceptable parce qu'on publie un correctif le jour même ; le raccourcir
 * suffit. Reste le contournement général du pré-vol, `SKIP_PREFLIGHT=1`.
 *
 * Usage :
 *   npx tsx scripts/content-lint/summary-length.ts <fichier-liste> <base-ref>
 *     Vérifie les fiches listées (un chemin par ligne). Mode CI.
 *     Ne bloque QUE si le chapeau est nouveau ou a changé.
 *
 *   npm run lint:summary-length
 *     Audite tout le dépôt et affiche un classement par dépassement.
 *     Mode local, ne fait jamais échouer.
 *
 * Sort en code 1 si au moins une fiche vérifiée est en faute.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  SUMMARY_DIRS,
  SUMMARY_MAX,
  checkSummaryLength,
  explainSummaryLength,
  localeOf,
  readSummary,
  shouldBlockSummary,
  type SummaryLengthCheck,
} from '../../src/lib/summary-length';
import { FrontmatterError } from '../../src/lib/frontmatter';
import { annotate } from './annotate';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function collectionOf(file: string): string {
  return file.replace(/^\.\//, '').split('/').slice(0, 2).join('/');
}

function isInScope(file: string): boolean {
  return SUMMARY_DIRS.some((dir) => file.replace(/^\.\//, '').startsWith(`${dir}/`));
}

function listAllCards(): string[] {
  const files: string[] = [];
  for (const dir of SUMMARY_DIRS) {
    const abs = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs).sort()) {
      if (name.endsWith('.mdx')) files.push(`${dir}/${name}`);
    }
  }
  return files;
}

/**
 * Chapeau de la fiche tel qu'il était sur la branche de base.
 *
 * Rend `null` si la fiche est nouvelle, undefined si elle existait sans
 * chapeau lisible (YAML cassé à la base compris : le chapeau compte alors comme
 * modifié, et le contrôle s'applique).
 */
function chapeauALaBase(base: string, file: string): string | null | undefined {
  let raw: string;
  try {
    raw = execFileSync('git', ['show', `${base}:${file}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null; // fiche nouvelle
  }
  try {
    return readSummary(raw);
  } catch {
    return undefined;
  }
}

interface Row {
  file: string;
  summary: string | undefined;
  check: SummaryLengthCheck;
}

function inspect(files: string[]): Row[] {
  const rows: Row[] = [];
  for (const file of files) {
    const abs = path.join(REPO_ROOT, file);
    if (!fs.existsSync(abs)) continue;
    const content = fs.readFileSync(abs, 'utf8');
    try {
      const summary = readSummary(content);
      rows.push({ file, summary, check: checkSummaryLength(summary) });
    } catch (err) {
      if (!(err instanceof FrontmatterError)) throw err;
      // YAML illisible : le build Velite échoue déjà, et faq-check comme
      // summary-freshness le bloquent sur leurs collections. On ne le double
      // pas ici, on ne juge que la longueur.
      rows.push({ file, summary: undefined, check: { verdict: 'missing', length: 0, overflow: 0 } });
    }
  }
  return rows;
}

function main(): void {
  const listPath = process.argv[2];

  // Mode audit : aucun argument, on regarde tout et on ne bloque rien.
  if (!listPath) {
    const rows = inspect(listAllCards())
      .filter((r) => r.check.verdict === 'too-long')
      .sort((a, b) => b.check.overflow - a.check.overflow);

    if (rows.length === 0) {
      console.log(`OK : aucun chapeau au-delà de ${SUMMARY_MAX} caractères.`);
      return;
    }

    console.log(`${rows.length} chapeau(x) au-delà du maximum du schéma (${SUMMARY_MAX} caractères) :\n`);
    for (const r of rows.slice(0, 40)) {
      console.log(
        `  +${String(r.check.overflow).padStart(4)}  ${String(r.check.length).padStart(4)} car.  ${r.file}`,
      );
    }
    if (rows.length > 40) console.log(`  … et ${rows.length - 40} autres.`);

    const parGroupe = new Map<string, number>();
    for (const r of rows) {
      const cle = `${collectionOf(r.file)} (${localeOf(r.file)})`;
      parGroupe.set(cle, (parGroupe.get(cle) ?? 0) + 1);
    }
    console.log('\nPar collection et locale :');
    for (const [c, n] of [...parGroupe.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
      console.log(`  ${String(n).padStart(3)}  ${c}`);
    }
    console.log('\nMode audit : aucune sortie en erreur. La CI ne bloque que les chapeaux nouveaux ou modifiés.');
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
    console.log('OK : aucune fiche concernée par le contrôle de longueur du chapeau.');
    return;
  }

  const base = process.argv[3];

  const fautives = inspect(changed).filter((r) =>
    shouldBlockSummary({
      current: r.summary,
      atBase: base ? chapeauALaBase(base, r.file) : undefined,
      hasBase: Boolean(base),
    }),
  );

  if (fautives.length === 0) {
    console.log(`OK : chapeau dans le maximum du schéma sur ${changed.length} fiche(s) vérifiée(s).`);
    return;
  }

  console.error(`FAIL : chapeau (summary) au-delà de ${SUMMARY_MAX} caractères dans les fiches suivantes :\n`);
  for (const r of fautives) {
    const message = explainSummaryLength(r.check, r.file);
    console.error(`  ${r.file}`);
    console.error(`      ${message}`);
    annotate('Chapeau trop long', message, r.file);
  }
  console.error(
    `\nvelite.config.ts déclare summary: s.string().max(${SUMMARY_MAX}), mais Velite ne\n` +
      `fait que le signaler en « info » et publie quand même. Le chapeau part en meta\n` +
      `description, JSON-LD, partage, carte de liste, chatbot et API publique.\n` +
      `Le contrôle ne vise que les chapeaux NOUVEAUX ou MODIFIÉS : la dette existante\n` +
      `se résorbe au rythme des réécritures, mais on n'en ajoute plus.`,
  );
  process.exit(1);
}

main();
