/**
 * scripts/content-lint/internal-links.ts
 *
 * Vérifie que chaque lien interne du contenu utilise le segment de route de sa
 * langue (/nl/domeinen/ et non /nl/bereiche/). La logique et son historique
 * sont dans src/lib/internal-links.ts ; la table de vérité est
 * src/i18n/routing.ts.
 *
 * Tout le dépôt est vérifié, pas seulement les fiches modifiées : un changement
 * de la table de routage peut casser des liens dans des fiches que personne ne
 * touche. Le coût est d'une seconde.
 *
 * content/digest/ est exclu : ce sont les archives d'emails déjà envoyés, et le
 * robot qui les écrit pousse sur main sans PR. Leurs liens sont corrigés à la
 * source, dans le générateur de bgm-ops.
 *
 * Usage :
 *   npx tsx scripts/content-lint/internal-links.ts
 *     Sort en code 1 au premier lien fautif. Mode CI et pré-vol.
 *   npx tsx scripts/content-lint/internal-links.ts --audit
 *     Affiche aussi les archives du digest, ne bloque jamais.
 */

import fs from 'node:fs';
import path from 'node:path';
import { routing } from '../../src/i18n/routing';
import { findRouteMismatches, type Pathnames, type RouteMismatch } from '../../src/lib/internal-links';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONTENT = path.join(REPO_ROOT, 'content');
const EXCLUDED = [path.join(CONTENT, 'digest') + path.sep];

function listMdx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listMdx(abs));
    else if (entry.name.endsWith('.mdx')) out.push(abs);
  }
  return out.sort();
}

function main(): void {
  const audit = process.argv.includes('--audit');
  const pathnames = routing.pathnames as unknown as Pathnames;
  const locales = routing.locales;

  let scannedLinks = 0;
  let checkedLinks = 0;
  const blocking: { file: string; m: RouteMismatch }[] = [];
  const archived: { file: string; m: RouteMismatch }[] = [];

  for (const abs of listMdx(CONTENT)) {
    const content = fs.readFileSync(abs, 'utf8');
    const count = (content.match(/\]\(\/[a-z]{2}\//g) ?? []).length;
    const isArchive = EXCLUDED.some((prefix) => abs.startsWith(prefix));
    scannedLinks += count;
    if (!isArchive) checkedLinks += count;
    for (const m of findRouteMismatches(content, pathnames, locales)) {
      (isArchive ? archived : blocking).push({ file: path.relative(REPO_ROOT, abs), m });
    }
  }

  // Des milliers de liens existent : n'en voir aucun signifie que le check est
  // aveugle (dossier déplacé, syntaxe changée), pas que tout va bien.
  if (scannedLinks === 0) {
    console.error('ERREUR : aucun lien interne trouvé dans content/. Le check est aveugle.');
    process.exit(1);
  }

  const print = (rows: { file: string; m: RouteMismatch }[], stream: (s: string) => void) => {
    for (const { file, m } of rows) {
      const fix = m.suggestion ? `remplacer par ${m.suggestion}` : 'segment inconnu de la table de routage (404 probable)';
      stream(`  ${file}:${m.line}  ${m.link}  ->  ${fix}`);
    }
  };

  if (audit) {
    console.log(`${scannedLinks} lien(s) interne(s) examiné(s).`);
    console.log(`Hors archives : ${blocking.length} lien(s) fautif(s).`);
    print(blocking, console.log);
    console.log(`Archives du digest (non bloquant) : ${archived.length} lien(s) hors table.`);
    print(archived, console.log);
    return;
  }

  if (blocking.length === 0) {
    const note = archived.length > 0 ? ` Archives du digest non vérifiées : ${archived.length} lien(s) hors table (npm run lint:links).` : '';
    console.log(`OK : ${checkedLinks} lien(s) interne(s) hors archives, tous sur le segment de route de leur langue.${note}`);
    return;
  }

  console.error(`FAIL : ${blocking.length} lien(s) interne(s) avec un segment de route d'une autre langue ou inconnu :\n`);
  print(blocking, console.error);
  console.error('');
  console.error('Chaque langue a ses propres segments (domaines, domeinen, domains, bereiche…).');
  console.error("Un segment d'une autre langue passe par une redirection, un segment inventé");
  console.error('renvoie une 404. La table de vérité est src/i18n/routing.ts.');
  process.exit(1);
}

main();
