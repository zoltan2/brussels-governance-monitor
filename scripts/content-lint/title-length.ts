/**
 * scripts/content-lint/title-length.ts
 *
 * Contrôle de la longueur du titre en résultat de recherche.
 *
 * Le raisonnement complet est dans `src/lib/title-length.ts`. En deux phrases :
 * `velite.config.ts` pose bien un `s.string().max(120)` sur le titre des fiches
 * secteur, mais Velite le signale en `info` et laisse passer. 231 fiches sur 380
 * portaient un titre au-delà du budget au 21/09/2026, sans que rien ne rougisse.
 *
 * Comme `summary-freshness`, ce lint ne se déclenche jamais sur une fiche qu'on
 * ne touche pas : la dette existante se résorbe au rythme des republications, et
 * ce qui est interdit, c'est d'en créer de la nouvelle.
 *
 * Usage :
 *   npx tsx scripts/content-lint/title-length.ts <fichier-liste> <base-ref>
 *     Vérifie les fiches listées (un chemin par ligne). Mode CI.
 *     Ne bloque QUE si le titre est nouveau ou a changé : voir plus bas.
 *
 *   npm run lint:titles
 *     Audite tout le dépôt et affiche un classement par dépassement.
 *     Mode local, ne fait jamais échouer sur les fiches non touchées.
 *
 * Sort en code 1 si au moins une fiche vérifiée est en faute.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  SERP_TITLE_BUDGET,
  TITLE_MAX,
  checkTitleLength,
  explainTitleLength,
  type TitleCheck,
} from '../../src/lib/title-length';
import { readFrontmatterScalar } from '../../src/lib/summary-freshness';
import { FrontmatterError } from '../../src/lib/frontmatter';
import { annotate } from './annotate';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Collections dont le titre part en résultat de recherche.
 *
 * `content/digest` en est exclu : ses titres sont fabriqués par le générateur
 * hebdomadaire, pas écrits à la main, et un lint qui bloque un robot n'aide
 * personne. `content/glossary`, `formation-events` et `formation-rounds` n'ont
 * pas d'URL propre (ancres sur une page de liste) : leur titre ne devient jamais
 * un titre de page.
 */
const SCOPED_DIRS = [
  'content/domain-cards',
  'content/dossiers',
  'content/sector-cards',
  'content/commune-cards',
  'content/comparison-cards',
  'content/solution-cards',
  'content/archive-pages',
] as const;

/**
 * Collections qui déclarent `seoTitle` au schéma Velite.
 *
 * Sert uniquement à adapter le message d'erreur : proposer `seoTitle` à une
 * collection qui ne l'a pas serait un conseil impossible à suivre, et ne pas le
 * proposer là où il existe prive le rédacteur de la seule solution.
 *
 * ⚑ Cette liste a déjà dérivé une fois, le 21/09/2026 : les champs ont été
 * étendus aux domaines, secteurs et comparaisons sans qu'elle bouge. Elle est
 * donc verrouillée par `src/lib/title-length.test.ts`, qui lit
 * `velite.config.ts` et échoue si les deux divergent.
 */
export const SEO_TITLE_DIRS = new Set([
  'content/dossiers',
  'content/domain-cards',
  'content/sector-cards',
  'content/comparison-cards',
]);

function collectionOf(file: string): string {
  return file.replace(/^\.\//, '').split('/').slice(0, 2).join('/');
}

function isInScope(file: string): boolean {
  return SCOPED_DIRS.some((dir) => file.replace(/^\.\//, '').startsWith(`${dir}/`));
}

function listAllCards(): string[] {
  const files: string[] = [];
  for (const dir of SCOPED_DIRS) {
    const abs = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs).sort()) {
      if (name.endsWith('.mdx')) files.push(`${dir}/${name}`);
    }
  }
  return files;
}

/**
 * Titre de la fiche tel qu'il était sur la branche de base.
 *
 * Rend `null` si la fiche est nouvelle.
 */
function titreALaBase(base: string, file: string): string | null | undefined {
  try {
    const raw = execFileSync('git', ['show', `${base}:${file}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return readFrontmatterScalar(raw, 'seoTitle') ?? readFrontmatterScalar(raw, 'title') ?? undefined;
  } catch {
    return null; // fiche nouvelle
  }
}

interface Row {
  file: string;
  check: TitleCheck;
  seoTitleSupported: boolean;
  unparsable?: string;
}

function inspect(files: string[]): Row[] {
  const rows: Row[] = [];
  for (const file of files) {
    const abs = path.join(REPO_ROOT, file);
    if (!fs.existsSync(abs)) continue;
    const seoTitleSupported = SEO_TITLE_DIRS.has(collectionOf(file));
    const content = fs.readFileSync(abs, 'utf8');
    try {
      const check = checkTitleLength({
        title: readFrontmatterScalar(content, 'title'),
        seoTitle: readFrontmatterScalar(content, 'seoTitle'),
      });
      rows.push({ file, check, seoTitleSupported });
    } catch (err) {
      if (!(err instanceof FrontmatterError)) throw err;
      rows.push({
        file,
        check: { verdict: 'missing', length: 0, rendered: 0, overflow: 0 },
        seoTitleSupported,
        unparsable: err.message,
      });
    }
  }
  return rows;
}

function main(): void {
  const listPath = process.argv[2];

  // Mode audit : aucun argument, on regarde tout et on ne bloque rien.
  if (!listPath) {
    const rows = inspect(listAllCards())
      .filter((r) => r.check.verdict !== 'ok')
      .sort((a, b) => b.check.overflow - a.check.overflow);

    if (rows.length === 0) {
      console.log(`OK : aucun titre au-delà de ${TITLE_MAX} caractères.`);
      return;
    }

    const parCollection = new Map<string, number>();
    for (const r of rows) {
      const c = collectionOf(r.file);
      parCollection.set(c, (parCollection.get(c) ?? 0) + 1);
    }

    console.log(
      `${rows.length} fiche(s) au-delà du budget (titre ${TITLE_MAX} caractères, ${SERP_TITLE_BUDGET} avec le suffixe) :\n`,
    );
    for (const r of rows.slice(0, 25)) {
      console.log(`  +${String(r.check.overflow).padStart(3)}  ${String(r.check.length).padStart(3)} car.  ${r.file}`);
    }
    if (rows.length > 25) console.log(`  … et ${rows.length - 25} autres.`);

    console.log('\nPar collection :');
    for (const [c, n] of [...parCollection.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(3)}  ${c}`);
    }
    console.log('\nMode audit : aucune sortie en erreur. La CI ne bloque que les fiches modifiées.');
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
    console.log('OK : aucune fiche concernée par le contrôle de titre.');
    return;
  }

  const base = process.argv[3];

  /**
   * NE BLOQUER QUE LA DETTE CRÉÉE, PAS CELLE QUI TRAÎNE.
   *
   * 288 fiches étaient hors budget au 21/09/2026, et une veille hebdomadaire en
   * republie des dizaines sans toucher à leur titre. Sans ce filtre, le lint
   * arrêterait chaque veille et finirait contourné par `--no-verify`, ce qui est
   * pire qu'un lint absent.
   *
   * On ne bloque donc que si le titre est NOUVEAU ou a CHANGÉ. C'est exactement
   * le mécanisme que l'audit a identifié comme cause structurelle : la veille
   * ajoute un fait au titre à chaque mise à jour, et les titres grossissent.
   * Allonger un titre déjà trop long devient interdit ; le laisser tel quel
   * reste possible, et se corrigera quand quelqu'un le réécrira.
   */
  const fautives = inspect(changed)
    .filter((r) => r.check.verdict !== 'ok')
    .filter((r) => {
      if (!base) return true; // sans base, on contrôle tout : mode strict.
      const avant = titreALaBase(base, r.file);
      if (avant === null) return true; // fiche nouvelle : aucune dette héritée.
      const maintenant = readFrontmatterScalar(
        fs.readFileSync(path.join(REPO_ROOT, r.file), 'utf8'),
        'seoTitle',
      ) ?? readFrontmatterScalar(fs.readFileSync(path.join(REPO_ROOT, r.file), 'utf8'), 'title');
      return avant !== maintenant;
    });

  if (fautives.length === 0) {
    console.log(`OK : titre dans le budget sur ${changed.length} fiche(s) vérifiée(s).`);
    return;
  }

  console.error('FAIL : titre au-delà du budget de recherche dans les fiches suivantes :\n');
  for (const r of fautives) {
    const message = r.unparsable ?? explainTitleLength(r.check, r.seoTitleSupported);
    console.error(`  ${r.file}`);
    console.error(`      ${message}`);
    annotate('Titre trop long pour un résultat de recherche', message, r.file);
  }
  console.error(
    `\nGoogle coupe autour de ${SERP_TITLE_BUDGET} caractères, suffixe « | BGM » compris.\n` +
      `Un titre tronqué perd sa part distinctive, et c'est elle qui fait cliquer.\n` +
      `Le contrôle ne vise que les titres NOUVEAUX ou MODIFIÉS : la dette existante\n` +
      `se résorbe au rythme des réécritures, mais on n'en ajoute plus.`,
  );
  process.exit(1);
}

main();
