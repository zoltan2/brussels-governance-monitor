/**
 * scripts/content-lint/status-boxes.ts
 *
 * Encadrés « Pourquoi ce statut » et « Ce que ça signifie concrètement » des
 * fiches domaine, voisin de impact-freshness.ts. Logique et historique
 * (page budget du 5 octobre 2026) : src/lib/status-boxes.ts.
 *
 * Une fiche domaine republiée qui porte ses encadrés doit porter
 * `statusReviewed` au jour de sa `lastModified` ou après. Une fiche domaine
 * sans encadrés est refusée : la page n'a plus de texte de repli.
 *
 * Usage :
 *   npx tsx scripts/content-lint/status-boxes.ts <fichier-liste>
 *     Vérifie les fiches domaine listées. Mode CI et pré-vol, bloquant.
 *     Échappement (correctif sans republication) : label `skip-status-check`
 *     posé À LA CRÉATION de la PR, ou SKIP_STATUS_CHECK=1 au pré-vol.
 *
 *   npx tsx scripts/content-lint/status-boxes.ts
 *     Audit de toutes les fiches domaine, ne bloque jamais.
 */
import fs from 'node:fs';
import path from 'node:path';
import { checkStatusBoxes, type StatusBoxesVerdict } from '../../src/lib/status-boxes';
import { FrontmatterError } from '../../src/lib/frontmatter';
import { readFrontmatterScalar } from '../../src/lib/summary-freshness';
import { annotate } from './annotate';

const DIR = 'content/domain-cards';
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PASSING: StatusBoxesVerdict[] = ['ok', 'draft'];

interface Row {
  file: string;
  verdict: StatusBoxesVerdict | 'unreadable';
  reason: string;
}

function inspect(files: string[]): Row[] {
  const rows: Row[] = [];
  for (const file of files) {
    const abs = path.join(REPO_ROOT, file);
    if (!fs.existsSync(abs)) continue;
    const content = fs.readFileSync(abs, 'utf8');
    try {
      const r = checkStatusBoxes({
        whyStatus: readFrontmatterScalar(content, 'whyStatus'),
        concreteImpact: readFrontmatterScalar(content, 'concreteImpact'),
        lastModified: readFrontmatterScalar(content, 'lastModified'),
        statusReviewed: readFrontmatterScalar(content, 'statusReviewed'),
        draft: readFrontmatterScalar(content, 'draft') === 'true',
      });
      rows.push({ file, verdict: r.verdict, reason: r.reason });
    } catch (err) {
      if (!(err instanceof FrontmatterError)) throw err;
      rows.push({ file, verdict: 'unreadable', reason: err.message });
    }
  }
  return rows;
}

function main(): void {
  const listPath = process.argv[2];

  if (!listPath) {
    const all = fs
      .readdirSync(path.join(REPO_ROOT, DIR))
      .filter((n) => n.endsWith('.mdx'))
      .sort()
      .map((n) => `${DIR}/${n}`);
    const rows = inspect(all);
    const absent = rows.filter((r) => r.verdict === 'absent').length;
    console.log(`Audit des encadrés de statut : ${absent} fiche(s) domaine sur ${all.length} sans encadrés.`);
    for (const r of rows.filter((x) => !PASSING.includes(x.verdict as StatusBoxesVerdict))) {
      console.log(`  ${r.file}  [${r.verdict}] ${r.reason}`);
    }
    console.log('\nMode audit : aucune sortie en erreur. La CI ne bloque que les fiches domaine modifiées.');
    return;
  }

  if (!fs.existsSync(listPath)) {
    console.error(`ERREUR : liste de fichiers introuvable (${listPath}).`);
    process.exit(1);
  }
  const changed = fs
    .readFileSync(listPath, 'utf8')
    .split('\n')
    .map((l) => l.trim().replace(/^\.\//, ''))
    .filter((l) => l.startsWith(`${DIR}/`) && l.endsWith('.mdx'));

  if (changed.length === 0) {
    console.log('Aucune fiche domaine modifiée, rien à vérifier.');
    return;
  }

  const inspected = inspect(changed);
  const violations = inspected.filter((r) => !PASSING.includes(r.verdict as StatusBoxesVerdict));
  if (violations.length === 0) {
    console.log(`OK : encadrés de statut présents et relus sur ${inspected.length} fiche(s) domaine vérifiée(s).`);
    return;
  }

  console.error('FAIL : encadrés de statut à relire dans les fiches domaine suivantes :\n');
  for (const v of violations) {
    console.error(`  ${v.file}`);
    console.error(`      ${v.reason}`);
    annotate('Encadrés de statut à relire', `${v.file} : ${v.reason}`, v.file);
  }
  console.error('');
  console.error('La page du domaine affiche « Pourquoi ce statut » et « Ce que ça signifie concrètement »');
  console.error("sous la date du jour. Le 5 octobre 2026, la page budget y annonçait encore un vote « prévu");
  console.error('avant le 1er avril ». Relire les deux textes, puis passer statusReviewed à la date du jour.');
  console.error('Ne jamais poser la date sans avoir relu : elle atteste une relecture humaine.');
  console.error("Correctif sans republication : label 'skip-status-check', posé À LA CRÉATION de la PR ;");
  console.error('en local SKIP_STATUS_CHECK=1.');
  process.exit(1);
}

main();
