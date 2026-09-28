/**
 * scripts/content-lint/duplicate-sources.ts
 *
 * Même URL citée deux fois dans le `sources:` du frontmatter d'une fiche,
 * après normalisation (sans utm_*, sans fragment, sans barre finale). Logique
 * et historique : src/lib/duplicate-sources.ts.
 *
 * Usage :
 *   npx tsx scripts/content-lint/duplicate-sources.ts <liste>
 *     Vérifie les MDX listés (fiches modifiées). Mode CI et pré-vol, bloquant.
 *
 *   npx tsx scripts/content-lint/duplicate-sources.ts
 *     Audit de tout content/ : compte la dette, ne bloque jamais.
 */
import fs from 'node:fs';
import path from 'node:path';
import { findDuplicateSources, type DuplicateSource } from '../../src/lib/duplicate-sources';
import { FrontmatterError, readGuardFrontmatter } from '../../src/lib/frontmatter';
import { annotate, safeLine } from './annotate';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function listAllMdx(): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const ent of fs.readdirSync(path.join(REPO_ROOT, rel), { withFileTypes: true })) {
      const child = `${rel}/${ent.name}`;
      if (ent.isDirectory()) walk(child);
      else if (ent.name.endsWith('.mdx')) out.push(child);
    }
  };
  walk('content');
  return out.sort();
}

function duplicatesOf(file: string): DuplicateSource[] | string {
  try {
    const data = readGuardFrontmatter(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8')) ?? {};
    return findDuplicateSources(data.sources);
  } catch (err) {
    if (!(err instanceof FrontmatterError)) throw err;
    return err.message;
  }
}

function describe(d: DuplicateSource): string {
  return `${d.url} (${d.labels.length} fois : ${d.labels.map((l) => `« ${safeLine(l)} »`).join(', ')})`;
}

function main(): void {
  const list = process.argv[2];

  if (!list) {
    let files = 0;
    let urls = 0;
    const rows: string[] = [];
    for (const file of listAllMdx()) {
      const d = duplicatesOf(file);
      if (typeof d === 'string' || d.length === 0) continue;
      files++;
      urls += d.length;
      rows.push(`  ${file}\n${d.map((x) => `      ${describe(x)}`).join('\n')}`);
    }
    console.log(`Audit des doubles sources : ${urls} URL en double dans ${files} fichier(s).\n`);
    for (const r of rows) console.log(r);
    console.log('\nMode audit : aucune sortie en erreur. La CI ne bloque que les fiches modifiées.');
    return;
  }

  if (!fs.existsSync(list)) {
    console.error(`ERREUR : liste de fichiers introuvable (${list}).`);
    process.exit(1);
  }
  const files = fs.readFileSync(list, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  const problems: string[] = [];
  let checked = 0;
  for (const file of files) {
    if (!file.endsWith('.mdx') || !fs.existsSync(path.join(REPO_ROOT, file))) continue;
    checked++;
    const d = duplicatesOf(file);
    if (typeof d === 'string') {
      problems.push(`  ${file}\n      ${d}`);
      continue;
    }
    if (d.length === 0) continue;
    problems.push(`  ${file}\n${d.map((x) => `      ${describe(x)}`).join('\n')}`);
    annotate('Source citée deux fois', `${file} : ${d.map((x) => x.url).join(' ; ')}`, file);
  }

  if (problems.length === 0) {
    console.log(`OK : aucune source en double sur ${checked} fiche(s) vérifiée(s).`);
    return;
  }
  console.error('FAIL : même source citée plusieurs fois dans sources: :\n');
  for (const p of problems) console.error(p);
  console.error(
    '\nGarder une seule entrée par URL (le libellé le plus précis) : un doublon gonfle le compte\n' +
      'de sources de la fiche. Les URL sont comparées sans utm_*, sans fragment ni barre finale.',
  );
  process.exit(1);
}

main();
