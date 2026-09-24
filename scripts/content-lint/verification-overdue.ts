/**
 * scripts/content-lint/verification-overdue.ts
 *
 * Vérifications en retard : alerte ÉDITORIALE, jamais publique, jamais bloquante.
 *
 * Le registre `content/verifications/` porte une `nextVerification` affichée
 * sur la fiche domaine mais jamais comparée à la date du jour : au 24/09/2026,
 * les échéances d'avril étaient dépassées sans que rien ne le dise. Les
 * dossiers et fiches domaine peuvent aussi porter `lastVerified` et
 * `verificationIntervalDays` (voir velite.config.ts). Ce contrôle liste tout
 * ce qui a dépassé son échéance.
 *
 * ⚑ UN RETARD NE FAIT JAMAIS ÉCHOUER. Une date dépassée survient avec le
 * temps, pas avec la PR : la rendre bloquante bloquerait chaque jour des PR
 * sans rapport. Le retard sort en avertissement (journal, annotation
 * `::warning`, résumé de l'étape), avec ses compteurs, et le code reste 0.
 * Seule une valeur ILLISIBLE ou FUTURE fait échouer : elle est introduite par
 * la PR qui l'écrit, et la corriger est l'affaire de cette PR.
 *
 * ⚑ JAMAIS MUET. Le OK imprime ses compteurs ; une lecture impossible
 * (répertoire absent, frontmatter cassé) échoue en le disant.
 *
 * Usage :
 *   npx tsx scripts/content-lint/verification-overdue.ts [--aujourdhui AAAA-MM-JJ]
 *   npm run lint:verifications
 * Sans option, « aujourd'hui » est le jour calendaire à Bruxelles.
 */

import fs from 'node:fs';
import path from 'node:path';
import { aujourdhuiBruxelles, bilanEcheances } from '../../src/lib/verification-due';
import { annotate, annotateWarning, safeLine } from './annotate';
import { formaterRapport, lireEntrees } from './verification-overdue-report';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function main(): number {
  const i = process.argv.indexOf('--aujourdhui');
  const aujourdhui = i >= 0 ? process.argv[i + 1] : aujourdhuiBruxelles();

  let rapport;
  try {
    const entrees = lireEntrees(REPO_ROOT);
    const bilan = bilanEcheances({ verifications: entrees.verifications, fiches: entrees.fiches, aujourdhui });
    rapport = formaterRapport(bilan, entrees.illisibles);
  } catch (err) {
    const motif = err instanceof Error ? err.message : String(err);
    console.error(`FAIL : vérifications en retard, contrôle impossible : ${safeLine(motif)}`);
    console.error('Ce contrôle ne peut rien affirmer : ni retard, ni absence de retard.');
    annotate('Vérifications en retard : contrôle impossible', motif);
    return 1;
  }

  for (const l of rapport.lignes) console.log(safeLine(l));
  for (const a of rapport.avertissements) annotateWarning(a.titre, a.message, a.fichier);
  for (const e of rapport.erreurs) annotate(e.titre, e.message, e.fichier);

  // Résumé de l'étape, visible en tête de la page du run GitHub Actions.
  const resume = process.env.GITHUB_STEP_SUMMARY;
  if (resume) {
    try {
      fs.appendFileSync(resume, `### Vérifications en retard\n\n\`\`\`\n${rapport.lignes.join('\n')}\n\`\`\`\n`);
    } catch {
      // Le résumé est un confort : le journal ci-dessus porte déjà tout.
    }
  }
  return rapport.code;
}

process.exit(main());
