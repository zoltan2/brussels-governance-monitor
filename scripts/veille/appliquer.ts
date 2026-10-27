/**
 * scripts/veille/appliquer.ts
 *
 * Applique un brouillon de veille : fiches en quatre langues, changelog, radar.
 * Le format du brouillon et ce qui s'en déduit : scripts/veille/brouillon.ts ;
 * un exemple : scripts/veille/brouillon.exemple.yaml.
 *
 *   npm run veille:appliquer -- <brouillon.yaml> --dry-run
 *     À lancer AVANT de montrer le brouillon : vérifie tout, ne laisse rien.
 *     Les contrôles du dépôt lisent l'arbre de travail : les fichiers sont donc
 *     écrits, contrôlés, puis remis dans leur état d'origine, quoi qu'il arrive.
 *
 *   npm run veille:appliquer -- <brouillon.yaml>
 *     Après validation, sur la branche de veille : mêmes contrôles, puis Velite,
 *     et les fichiers restent écrits. Au moindre échec, tout est remis en état.
 *
 *   --sans-velite   ne lance pas Velite (mode écriture)
 *   --avec-velite   lance aussi Velite à blanc
 *   --sans-fetch    ne rafraîchit pas origin/main avant de comparer
 *
 * La commande n'affiche qu'un verdict. En cas d'échec : le contrôle fautif et
 * sa sortie, jamais un vide ; le journal complet reste dans
 * .local/veille/appliquer.log. Elle ne commite pas, ne pousse pas, ne fusionne
 * pas, et ne vérifie ni les faits ni les liens.
 */
import { execFile, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lireBrouillon, planifier, type Depot } from './brouillon';

const BASE = 'origin/main';
const LINT = 'scripts/content-lint';

function git(racine: string, args: string[]): string {
  return execFileSync('git', args, { cwd: racine, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function depotSur(racine: string): Depot {
  return {
    lire: (chemin) => {
      const abs = path.join(racine, chemin);
      return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
    },
    lireBase: (chemin) => {
      try {
        return git(racine, ['show', `${BASE}:${chemin}`]);
      } catch {
        return null;
      }
    },
  };
}

interface Resultat {
  nom: string;
  code: number;
  sortie: string;
}

function lancer(racine: string, nom: string, commande: string, args: string[]): Promise<Resultat> {
  return new Promise((resolve) => {
    execFile(commande, args, { cwd: racine, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      const code = err ? (typeof err.code === 'number' ? err.code : 1) : 0;
      resolve({ nom, code, sortie: `${stdout}${stderr}` });
    });
  });
}

/** Les contrôles du pré-vol et de la CI, sur l'arbre de travail : mêmes scripts, pas de copie. */
function controles(racine: string, liste: string, mdx: boolean, donnees: boolean): Promise<Resultat>[] {
  const tsx = (nom: string, script: string, ...args: string[]) => lancer(racine, nom, 'npx', ['tsx', `${LINT}/${script}`, ...args]);
  const bash = (nom: string, appel: string) => lancer(racine, nom, 'bash', ['-c', `. ${LINT}/lib.sh; ${appel}`]);
  const sur: Promise<Resultat>[] = [];
  if (mdx) {
    sur.push(
      bash('phrases temporelles', `check_temporal < "${liste}"`),
      bash('sources vides', `check_empty_sources < "${liste}"`),
      bash('lastModified', `check_lastmodified ${BASE} < "${liste}"`),
      tsx('FAQ relue et questions uniques', 'faq-check.ts', liste),
      tsx('chapeau relu', 'summary-freshness.ts', liste),
      tsx('changeSummary daté', 'change-summary-date.ts', liste, BASE),
      tsx('longueur du titre', 'title-length.ts', liste, BASE),
      tsx('longueur du chapeau', 'summary-length.ts', liste, BASE),
      tsx('accroche', 'lead-headline.ts', liste, BASE),
      tsx('sources en double', 'duplicate-sources.ts', liste),
      tsx("texte d'impact (secteurs)", 'impact-freshness.ts', liste),
      tsx('encadrés de statut (domaines)', 'status-boxes.ts', liste),
      bash('changeType et changelog', 'check_change_type'),
    );
  }
  if (donnees) {
    sur.push(tsx('schémas du radar et du changelog', 'data-schemas.ts'), bash('textes du radar et du changelog', `check_data_texts ${BASE}`));
  }
  return sur;
}

/** Sortie d'un contrôle en échec : entière si elle est courte, sinon les lignes d'erreur et la fin. */
function extrait(sortie: string): string {
  const lignes = sortie.trimEnd().split('\n');
  if (lignes.length <= 40) return lignes.join('\n');
  const utiles = lignes.filter((l) => /FAIL|❌|error|Error/.test(l)).slice(0, 25);
  return [...utiles, `[…] ${lignes.length} lignes, fin :`, ...lignes.slice(-15)].join('\n');
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const fichier = args.find((a) => !a.startsWith('--'));
  const drapeau = (d: string) => args.includes(d);
  const aBlanc = drapeau('--dry-run');
  if (!fichier) {
    console.error('usage : npm run veille:appliquer -- <brouillon.yaml> [--dry-run] [--sans-velite] [--avec-velite] [--sans-fetch]');
    return 2;
  }
  const echec = (titre: string, details: string[]): number => {
    console.error(`FAIL : ${titre}`);
    for (const d of details) console.error(`  - ${d}`);
    console.error("Rien n'a été écrit.");
    return 1;
  };

  const lu = lireBrouillon(fs.readFileSync(fichier, 'utf8'));
  if ('problemes' in lu) return echec(`brouillon invalide (${fichier})`, lu.problemes);

  const racine = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim();
  if (!drapeau('--sans-fetch')) {
    try {
      git(racine, ['fetch', '--quiet', 'origin', 'main']);
    } catch {
      console.error(`attention : git fetch a échoué, comparaison avec ${BASE} tel qu'il est en local`);
    }
  }

  const plan = planifier(lu.brouillon, depotSur(racine));
  if (plan.problemes.length > 0) return echec(`${plan.problemes.length} problème(s) dans le brouillon`, plan.problemes);

  const chemins = [...plan.ecritures.keys()];
  const sales = git(racine, ['status', '--porcelain', '--', ...chemins]).trim();
  if (sales) return echec('fichiers visés déjà modifiés et non commités', sales.split('\n'));
  if (!aBlanc && git(racine, ['rev-parse', '--abbrev-ref', 'HEAD']).trim() === 'main') {
    return echec('branche main', ['créer la branche de veille (content/veille-AAAA-MM-JJ) avant d\'écrire']);
  }

  const origine = new Map(chemins.map((c) => [c, fs.readFileSync(path.join(racine, c), 'utf8')]));
  const ecrire = (contenus: Map<string, string>) => {
    for (const [c, t] of contenus) fs.writeFileSync(path.join(racine, c), t);
  };
  let restaure = false;
  const restaurer = () => {
    if (!restaure) ecrire(origine);
    restaure = true;
  };
  process.on('SIGINT', () => {
    restaurer();
    process.exit(130);
  });

  const journal = path.join(racine, '.local', 'veille', 'appliquer.log');
  fs.mkdirSync(path.dirname(journal), { recursive: true });
  const liste = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'veille-')), 'mdx.txt');
  fs.writeFileSync(liste, `${plan.mdx.join('\n')}\n`);

  let rates: Resultat[] = [];
  try {
    ecrire(plan.ecritures);
    const resultats = await Promise.all(controles(racine, liste, plan.mdx.length > 0, chemins.some((c) => c.startsWith('data/'))));
    if (resultats.every((r) => r.code === 0) && (aBlanc ? drapeau('--avec-velite') : !drapeau('--sans-velite'))) {
      resultats.push(await lancer(racine, 'Velite (aucune fiche écartée)', 'node', ['scripts/ops/velite-sans-erreur.mjs']));
    }
    fs.writeFileSync(journal, resultats.map((r) => `===== ${r.nom} (code ${r.code})\n${r.sortie}`).join('\n'));
    rates = resultats.filter((r) => r.code !== 0);
  } finally {
    if (aBlanc || rates.length > 0) restaurer();
  }

  if (rates.length > 0) {
    console.error(`FAIL : ${rates.length} contrôle(s) en échec. Les fichiers ont été remis dans leur état d'origine.`);
    for (const r of rates) console.error(`\n--- ${r.nom} (code ${r.code})\n${extrait(r.sortie) || '(aucune sortie)'}`);
    console.error(`\nJournal complet : ${journal}`);
    return 1;
  }

  for (const l of plan.lignes) console.log(l);
  for (const a of plan.avertissements) console.log(`attention : ${a}`);
  if (aBlanc) {
    console.log(`OK à blanc : ${chemins.length} fichier(s) contrôlés, rien n'est resté écrit.`);
  } else {
    console.log(`OK : ${chemins.length} fichier(s) écrits. À commiter :\ngit add ${chemins.join(' ')}`);
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
