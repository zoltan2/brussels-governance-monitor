/**
 * scripts/content-lint/data-schemas.ts
 *
 * Valide data/radar.json, data/changelog.json et data/commitments.json contre
 * leurs schémas Zod (src/lib/radar.ts, changelog.ts, commitments.ts), PUIS
 * contrôle que les signaux radar promus (`promotedTo`/`promotedSection`)
 * pointent vers une fiche qui existe vraiment (src/lib/radar-content-check.ts).
 *
 * Pourquoi : ces fichiers ne sont validés qu'au `next build`, au moment où une
 * page les importe. Une veille qui oublie `promotedTo: null` dans un signal
 * radar passait le pré-vol et `npx velite build`, puis cassait « Lint,
 * Typecheck & Build » en CI, contrôle exigé par /fr/admin. Ici : moins d'une
 * seconde, au pré-vol.
 *
 * Le contrôle croisé promotedTo/promotedSection lit les NOMS DE FICHIERS de
 * content/{domain-cards,dossiers,commune-cards,sector-cards}/ (pattern
 * `<slug>.<locale>.mdx`) plutôt que `.velite/`, qui n'existe pas encore à ce
 * stade (le pré-vol tourne avant `next build`) : `src/lib/content.ts`
 * répondrait alors des collections vides, et le contrôle échouerait fermé sur
 * tout le fichier au lieu de détecter les vraies erreurs. Même convention que
 * scripts/content-lint/slug-redirects.ts.
 *
 * `cards[]` est vérifié séparément (mêmes collections + comparaisons et
 * solutions) mais REPORTÉ SEULEMENT : voir la doc de checkRadarCardSlugs().
 *
 * Usage : npx tsx scripts/content-lint/data-schemas.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { getChangelog } from '../../src/lib/changelog';
import type { PromotionSlugSets } from '../../src/lib/radar';
import {
  checkRadarPromotions,
  checkRadarCardSlugs,
  type CardSlugSets,
  type RadarPromotionEntryInput,
} from '../../src/lib/radar-content-check';
import { annotate } from './annotate';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** Slugs d'une collection de contenu, dérivés des noms de fichiers `<slug>.<locale>.mdx`. */
function slugsFromContentDir(dirName: string): Set<string> {
  const dir = path.join(REPO_ROOT, 'content', dirName);
  const set = new Set<string>();
  for (const file of fs.readdirSync(dir)) {
    const m = /^(.+)\.(fr|nl|en|de)\.mdx$/.exec(file);
    if (m) set.add(m[1]!);
  }
  return set;
}

function loadContentSlugSets(): CardSlugSets {
  return {
    domains: slugsFromContentDir('domain-cards'),
    dossiers: slugsFromContentDir('dossiers'),
    communes: slugsFromContentDir('commune-cards'),
    sectors: slugsFromContentDir('sector-cards'),
    comparisons: slugsFromContentDir('comparison-cards'),
    solutions: slugsFromContentDir('solution-cards'),
  };
}

interface RadarJsonEntry extends RadarPromotionEntryInput {
  cards: string[];
}

function checkRadarPromotedLinks(): void {
  const raw = fs.readFileSync(path.join(REPO_ROOT, 'data', 'radar.json'), 'utf8');
  const data = JSON.parse(raw) as { entries: RadarJsonEntry[] };
  const slugSets = loadContentSlugSets();
  const promotionSlugSets: PromotionSlugSets = {
    domains: slugSets.domains,
    dossiers: slugSets.dossiers,
    communes: slugSets.communes,
    sectors: slugSets.sectors,
  };

  const violations = checkRadarPromotions(data.entries, promotionSlugSets);
  if (violations.length > 0) {
    throw new Error(
      `${violations.length} signal(aux) radar avec un lien « voir la fiche » cassé :\n` +
        violations.map((v) => `  - ${v.message}`).join('\n'),
    );
  }

  // cards[] : reporté, ne bloque pas le pré-vol/CI (voir checkRadarCardSlugs).
  const cardViolations = checkRadarCardSlugs(data.entries, slugSets);
  if (cardViolations.length > 0) {
    console.warn(
      `INFO : ${cardViolations.length} slug(s) de cards[] introuvable(s) dans aucune collection ` +
        `(domaines/dossiers/communes/secteurs/comparaisons/solutions), non bloquant :`,
    );
    for (const v of cardViolations) console.warn(`  - ${v.id} : cards[] contient "${v.card}"`);
  }
}

async function main(): Promise<void> {
  const failures: string[] = [];
  const check = async (name: string, load: () => Promise<unknown> | unknown) => {
    try {
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`${name} :\n${msg.split('\n').slice(0, 30).join('\n')}`);
    }
  };
  // radar et commitments valident à l'import du module.
  await check('data/radar.json', () => import('../../src/lib/radar'));
  await check('data/commitments.json', () => import('../../src/lib/commitments'));
  await check('data/changelog.json', () => getChangelog('fr'));
  await check('data/radar.json (liens « voir la fiche »)', () => checkRadarPromotedLinks());

  if (failures.length === 0) {
    console.log('OK : radar, changelog et engagements conformes à leurs schémas.');
    return;
  }
  console.error('FAIL : fichier(s) de données non conforme(s) à leur schéma :\n');
  for (const f of failures) {
    console.error(f + '\n');
    annotate('Fichier de données non conforme', f.split('\n')[0]!.replace(/ :$/, '') + ' ne respecte pas son schéma : le build de production échouerait.');
  }
  console.error('Le build de production échouerait sur ces fichiers. Voir src/lib/radar.ts, changelog.ts, commitments.ts.');
  process.exit(1);
}

void main();
