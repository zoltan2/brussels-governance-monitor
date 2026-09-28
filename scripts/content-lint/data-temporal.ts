/**
 * scripts/content-lint/data-temporal.ts
 *
 * Phrases temporelles relatives (content-integrity, règle 1) dans les textes de
 * data/radar.json (summary, descriptions, nextStep) et data/changelog.json
 * (descriptions, summaries), hors citations « ». Mêmes motifs que les MDX :
 * scripts/content-lint/temporal-patterns.txt. Logique et historique :
 * src/lib/data-temporal.ts.
 *
 * Usage :
 *   npx tsx scripts/content-lint/data-temporal.ts <base>
 *     Ne vérifie que les textes ajoutés ou réécrits par rapport à <base>
 *     (signal par id, entrée du changelog par date, section et slug).
 *     Mode CI et pré-vol, bloquant.
 *
 *   npx tsx scripts/content-lint/data-temporal.ts
 *     Audit des deux fichiers entiers : liste la dette, ne bloque jamais.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  changedChangelogTexts,
  changedRadarTexts,
  findTemporal,
  parseTemporalPatterns,
  temporalHits,
  type ChangelogLike,
  type DataText,
  type RadarLike,
  type TemporalFinding,
} from '../../src/lib/data-temporal';
import { annotate, safeLine } from './annotate';
import { REPO_ROOT, baseExists, readAtBase } from './git-base';

const RADAR = 'data/radar.json';
const CHANGELOG = 'data/changelog.json';

function radarEntries(json: string): RadarLike[] {
  return (JSON.parse(json) as { entries: RadarLike[] }).entries;
}

function print(file: string, f: TemporalFinding, out: (s: string) => void): void {
  out(`  ${file}  ${f.where}  [${f.field}]  « ${f.hits.join(' », « ')} »`);
  out(`      ${safeLine(f.text).slice(0, 220)}`);
}

function main(): void {
  const base = process.argv[2];
  const patternsFile = path.join(REPO_ROOT, 'scripts/content-lint/temporal-patterns.txt');
  const patterns = fs.existsSync(patternsFile) ? parseTemporalPatterns(fs.readFileSync(patternsFile, 'utf8')) : [];
  if (patterns.length === 0) {
    // Même règle que check_temporal : sans motifs, la garde échoue fermée.
    console.error(`ERREUR : ${patternsFile} manquant ou vide, contrôle désactivé.`);
    process.exit(1);
  }

  const radarHead = radarEntries(fs.readFileSync(path.join(REPO_ROOT, RADAR), 'utf8'));
  const changelogHead = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, CHANGELOG), 'utf8')) as ChangelogLike[];

  let radarTexts: DataText[];
  let changelogTexts: DataText[];
  if (!base) {
    radarTexts = changedRadarTexts(null, radarHead);
    changelogTexts = changedChangelogTexts(null, changelogHead);
  } else {
    if (!baseExists(base)) {
      console.error(`ERREUR : base git introuvable (${base}).`);
      process.exit(1);
    }
    const r = readAtBase(base, RADAR);
    const c = readAtBase(base, CHANGELOG);
    radarTexts = changedRadarTexts(r === null ? null : radarEntries(r), radarHead);
    changelogTexts = changedChangelogTexts(c === null ? null : (JSON.parse(c) as ChangelogLike[]), changelogHead);
  }

  const radarHits = findTemporal(radarTexts, patterns);
  const changelogHits = findTemporal(changelogTexts, patterns);
  const total = radarHits.length + changelogHits.length;

  if (!base) {
    // Témoin : les motifs trouvés seulement dans une citation, exclus exprès.
    const quotedOnly = [...radarTexts, ...changelogTexts].filter(
      (t) => temporalHits(t.text, patterns).length === 0 && temporalHits(t.text, patterns, { keepQuotations: true }).length > 0,
    ).length;
    console.log(
      `Audit des phrases temporelles dans data/ : ${total} texte(s) ` +
        `(${radarHits.length} dans le radar, ${changelogHits.length} dans le changelog), ` +
        `plus ${quotedOnly} texte(s) où le motif n'apparaît que dans une citation « », non compté(s).\n`,
    );
    for (const f of radarHits) print(RADAR, f, console.log);
    for (const f of changelogHits) print(CHANGELOG, f, console.log);
    console.log('\nMode audit : aucune sortie en erreur. La CI ne bloque que les textes ajoutés ou réécrits.');
    return;
  }

  const checked = radarTexts.length + changelogTexts.length;
  if (total === 0) {
    console.log(`OK : phrases temporelles, ${checked} texte(s) ajouté(s) ou réécrit(s) dans data/ vérifié(s).`);
    return;
  }
  console.error('FAIL : phrases temporelles relatives dans data/ (content-integrity, règle 1) :\n');
  for (const f of radarHits) print(RADAR, f, console.error);
  for (const f of changelogHits) print(CHANGELOG, f, console.error);
  for (const [file, f] of [...radarHits.map((f) => [RADAR, f] as const), ...changelogHits.map((f) => [CHANGELOG, f] as const)]) {
    annotate('Phrase temporelle relative', `${file}, ${f.where} [${f.field}] : « ${f.hits.join(' », « ')} ». Remplacer par une date absolue.`, file);
  }
  console.error(
    "\nL'accueil et /radar affichent ces textes pendant des semaines : remplacer par une date absolue\n" +
      "(ex. « avant le 15 juin 2026 »). Une citation entre « » n'est pas vérifiée.",
  );
  process.exit(1);
}

main();
