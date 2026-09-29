/**
 * scripts/content-lint/impact-freshness.ts
 *
 * Fraîcheur du texte d'impact des fiches secteur (`title`, `humanImpact`,
 * `activeMechanisms`), voisin de summary-freshness.ts. Logique et historique
 * (sector-cards/education, #619) : src/lib/impact-freshness.ts.
 *
 * Une fiche secteur republiée doit porter `impactReviewed` au plus 90 jours
 * avant sa `lastModified`. Ne se déclenche jamais sur une fiche qu'on ne
 * touche pas.
 *
 * Usage :
 *   npx tsx scripts/content-lint/impact-freshness.ts <fichier-liste>
 *     Vérifie les fiches secteur listées. Mode CI et pré-vol, bloquant.
 *     Échappement (migration en masse, correctif sans republication) : label
 *     `skip-impact-check` posé À LA CRÉATION de la PR, ou SKIP_IMPACT_CHECK=1
 *     au pré-vol.
 *
 *   npx tsx scripts/content-lint/impact-freshness.ts
 *     Audit de toutes les fiches secteur, ne bloque jamais.
 */
import fs from 'node:fs';
import path from 'node:path';
import { IMPACT_MAX_AGE_DAYS, checkImpactFreshness } from '../../src/lib/impact-freshness';
import { FrontmatterError } from '../../src/lib/frontmatter';
import { readFrontmatterScalar } from '../../src/lib/summary-freshness';
import { annotate } from './annotate';

const DIR = 'content/sector-cards';
const REPO_ROOT = path.resolve(__dirname, '..', '..');

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
    try {
      const r = checkImpactFreshness({
        lastModified: readFrontmatterScalar(content, 'lastModified'),
        impactReviewed: readFrontmatterScalar(content, 'impactReviewed'),
        draft: readFrontmatterScalar(content, 'draft') === 'true',
      });
      rows.push({ file, verdict: r.verdict, ageDays: r.ageDays, reason: r.reason });
    } catch (err) {
      if (!(err instanceof FrontmatterError)) throw err;
      rows.push({ file, verdict: 'unparsable', ageDays: null, reason: err.message });
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
    const rows = inspect(all).filter((r) => r.verdict !== 'ok' && r.verdict !== 'draft');
    const missing = rows.filter((r) => r.verdict === 'missing').length;
    console.log(
      `Audit du texte d'impact des fiches secteur : ${rows.length} fiche(s) sur ${all.length} à relire ` +
        `(${missing} sans impactReviewed, limite ${IMPACT_MAX_AGE_DAYS} jours).`,
    );
    for (const r of rows.filter((x) => x.verdict !== 'missing')) console.log(`  ${r.file}  [${r.verdict}] ${r.reason}`);
    console.log('\nMode audit : aucune sortie en erreur. La CI ne bloque que les fiches secteur modifiées.');
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
    console.log('Aucune fiche secteur modifiée, rien à vérifier.');
    return;
  }

  const inspected = inspect(changed);
  for (const d of inspected.filter((r) => r.verdict === 'draft')) console.log(`  ${d.file} : ${d.reason}`);
  const violations = inspected.filter((r) => r.verdict !== 'ok' && r.verdict !== 'draft');
  if (violations.length === 0) {
    console.log(`OK : texte d'impact relu sur ${inspected.length} fiche(s) secteur vérifiée(s).`);
    return;
  }

  console.error("FAIL : texte d'impact à relire dans les fiches secteur suivantes :\n");
  for (const v of violations) {
    console.error(`  ${v.file}`);
    console.error(`      ${v.reason}`);
    annotate("Texte d'impact à relire", `${v.file} : ${v.reason}`, v.file);
  }
  console.error('');
  console.error("L'accueil et la page du secteur affichent « Mis à jour le … » au-dessus de title, humanImpact");
  console.error('et activeMechanisms. Une veille qui republie la fiche sans les relire date du jour un texte');
  console.error("ancien (sector-cards/education, #619). Relire ces trois champs, puis passer impactReviewed à la");
  console.error('date du jour. Ne jamais poser la date sans avoir relu : elle atteste une relecture humaine.');
  console.error("Migration en masse : label 'skip-impact-check', posé À LA CRÉATION de la PR (ajouté après");
  console.error('coup, il ne relance pas la CI : fermer puis rouvrir la PR) ; en local SKIP_IMPACT_CHECK=1.');
  process.exit(1);
}

main();
