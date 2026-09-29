/**
 * scripts/content-lint/radar-summary.ts
 *
 * Tout signal AJOUTÉ à data/radar.json (id absent de la base) porte un
 * `summary` dans les quatre langues, de 20 à 180 caractères. Logique et
 * historique : src/lib/radar-summary-check.ts.
 *
 * Usage :
 *   npx tsx scripts/content-lint/radar-summary.ts <base>
 *     Mode CI et pré-vol, bloquant sur les signaux ajoutés.
 *
 *   npx tsx scripts/content-lint/radar-summary.ts
 *     Audit : compte les signaux actifs hors règle, ne bloque jamais.
 */
import fs from 'node:fs';
import path from 'node:path';
import { addedRadarEntries, radarSummaryProblems, type RadarSummaryEntry } from '../../src/lib/radar-summary-check';
import { annotate } from './annotate';
import { REPO_ROOT, baseExists, readAtBase } from './git-base';

const RADAR = 'data/radar.json';
type Entry = RadarSummaryEntry & { status?: string; date?: string };

const entriesOf = (json: string) => (JSON.parse(json) as { entries: Entry[] }).entries;

function main(): void {
  const base = process.argv[2];
  const head = entriesOf(fs.readFileSync(path.join(REPO_ROOT, RADAR), 'utf8'));

  if (!base) {
    const active = head.filter((e) => e.status === 'active');
    const faulty = active.filter((e) => radarSummaryProblems(e).length > 0);
    const missing = faulty.filter((e) => !e.summary).length;
    console.log(
      `Audit des résumés du radar : ${faulty.length} signal(aux) actif(s) sur ${active.length} hors règle ` +
        `(${missing} sans summary, ${faulty.length - missing} hors bornes dans au moins une langue).`,
    );
    for (const e of faulty.slice(0, 15)) console.log(`  ${e.id}  ${radarSummaryProblems(e).join(' ')}`);
    if (faulty.length > 15) console.log(`  … et ${faulty.length - 15} autres.`);
    console.log('\nMode audit : aucune sortie en erreur. La CI ne bloque que les signaux ajoutés.');
    return;
  }

  if (!baseExists(base)) {
    console.error(`ERREUR : base git introuvable (${base}).`);
    process.exit(1);
  }
  const before = readAtBase(base, RADAR);
  const added = addedRadarEntries(before === null ? null : entriesOf(before), head);
  const problems = added.map((e) => ({ id: e.id, p: radarSummaryProblems(e) })).filter((x) => x.p.length > 0);

  if (problems.length === 0) {
    console.log(`OK : résumé du radar présent et dans les bornes sur ${added.length} signal(aux) ajouté(s).`);
    return;
  }
  console.error('FAIL : signal ajouté au radar sans résumé conforme :\n');
  for (const { id, p } of problems) {
    console.error(`  ${id}`);
    for (const line of p) console.error(`      ${line}`);
    annotate('Résumé du signal radar', `${id} : ${p.join(' ')}`, RADAR);
  }
  console.error(
    "\nL'accueil affiche summary sous chaque signal. Sans lui, il coupe descriptions au premier point,\n" +
      'ce qui donne « Am 14. » ou « Hub. ». Écrire un résumé autonome de 20 à 180 caractères par langue.',
  );
  process.exit(1);
}

main();
