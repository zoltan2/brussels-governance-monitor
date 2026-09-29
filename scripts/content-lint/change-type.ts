/**
 * scripts/content-lint/change-type.ts
 *
 * `changeType` d'une fiche cohérent avec le `type` de son entrée du changelog,
 * quand `changeSummaryDate` tombe le jour de cette entrée. Logique et
 * historique (dossier enseignement affiché « Correction » le 28/09/2026) :
 * src/lib/change-type-consistency.ts.
 *
 * Garde GLOBALE : tout le dépôt concordait au 28/09 après #623, elle vérifie
 * donc toutes les fiches, pas seulement celles de la PR. Une PR qui ne touche
 * que data/changelog.json peut aussi créer l'incohérence.
 *
 * Usage : npx tsx scripts/content-lint/change-type.ts
 *   Échoue (1) sur une incohérence ; les cas que le schéma ne sait pas dire
 *   (entrée `corrected` sur une fiche domaine) sont affichés en avertissement.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SECTION_OF_DIR, changeTypeFinding, type ChangelogRef } from '../../src/lib/change-type-consistency';
import { FrontmatterError } from '../../src/lib/frontmatter';
import { readFrontmatterScalar } from '../../src/lib/summary-freshness';
import { annotate, annotateWarning } from './annotate';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function main(): void {
  const changelog = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data/changelog.json'), 'utf8')) as ChangelogRef[];
  const errors: string[] = [];
  const warnings: string[] = [];
  let checked = 0;

  for (const dir of Object.keys(SECTION_OF_DIR)) {
    const abs = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs).sort()) {
      if (!name.endsWith('.mdx')) continue;
      const file = `${dir}/${name}`;
      const slug = name.replace(/(?:\.[a-z]{2})?\.mdx$/, '');
      try {
        const raw = fs.readFileSync(path.join(abs, name), 'utf8');
        checked++;
        const finding = changeTypeFinding(
          {
            dir,
            slug,
            changeType: readFrontmatterScalar(raw, 'changeType'),
            changeSummaryDate: readFrontmatterScalar(raw, 'changeSummaryDate'),
          },
          changelog,
        );
        if (!finding) continue;
        if (finding.level === 'error') {
          errors.push(`  ${file}\n      ${finding.message}`);
          annotate('Type de changement incohérent', `${file} : ${finding.message}`, file);
        } else {
          warnings.push(`  ${file}\n      ${finding.message}`);
          annotateWarning('Correction non représentable', `${file} : ${finding.message}`, file);
        }
      } catch (err) {
        if (!(err instanceof FrontmatterError)) throw err;
        errors.push(`  ${file}\n      ${err.message}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.log(`AVERTISSEMENT (non bloquant) : ${warnings.length} fiche(s) domaine dont la correction du changelog n'a pas de changeType possible :`);
    for (const w of warnings) console.log(w);
  }
  if (errors.length === 0) {
    console.log(`OK : changeType cohérent avec le changelog sur ${checked} fiche(s).`);
    return;
  }
  console.error(`FAIL : changeType incohérent avec le changelog (${errors.length} fiche(s)) :\n`);
  for (const e of errors) console.error(e);
  process.exit(1);
}

main();
