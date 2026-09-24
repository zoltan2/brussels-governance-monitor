/**
 * scripts/controle-apres-build.ts
 *
 * Contrôle après build : chaque page de contenu promise a-t-elle été pré-rendue ?
 *
 * Le raisonnement complet est dans `src/lib/controle-build.ts`. En deux phrases :
 * les routes de contenu déclarent `dynamicParams = false`, donc une page que
 * `generateStaticParams` oublie n'existe pas et répond 404 ; et `next build`
 * reste vert même s'il ne pré-rend AUCUNE fiche. Ce script compare ce que les
 * sorties Velite promettent à ce que le build a réellement écrit.
 *
 * Usage (après `npm run build`, qui produit `.velite/` et `.next/`) :
 *   npx tsx scripts/controle-apres-build.ts
 *
 * Ne dépend d'aucune variable d'environnement : il ne lit que des fichiers.
 * Sort en code 1 si une page attendue manque, si une locale exigée n'a aucune
 * page, ou si un artefact de build est absent ou illisible.
 */

import fs from 'node:fs';
import path from 'node:path';
import { routing } from '../src/i18n/routing';
import { jourISO } from '../src/lib/velite-date';
import { SCROLLY_ENABLED_DOSSIERS } from '../src/lib/scrolly-allowlist';
import { validateLocalizedSlugs } from '../src/lib/content';
import {
  comparer,
  formaterRapport,
  pagesAttendues,
  pagesProduites,
  type CollectionsVelite,
  type ManifestePrerendu,
} from '../src/lib/controle-build';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(__dirname, '..');
const VELITE_DIR = path.join(REPO_ROOT, '.velite');
const NEXT_DIR = path.join(REPO_ROOT, '.next');
const MANIFESTE = path.join(NEXT_DIR, 'prerender-manifest.json');
/** Où Next 16 écrit le HTML pré-rendu de l'App Router (hors `output: 'standalone'`). */
const HTML_DIR = path.join(NEXT_DIR, 'server', 'app');

const COLLECTIONS: Array<keyof CollectionsVelite> = [
  'domainCards',
  'sectorCards',
  'solutionCards',
  'comparisonCards',
  'communeCards',
  'archivePages',
  'dossierCards',
  'verifications',
  'digestEntries',
];

function echouer(message: string): never {
  console.error(`controle-apres-build : ${message}`);
  process.exit(1);
}

function lireJson(fichier: string): unknown {
  if (!fs.existsSync(fichier)) echouer(`fichier absent : ${path.relative(REPO_ROOT, fichier)} (le build a-t-il tourné ?)`);
  try {
    return JSON.parse(fs.readFileSync(fichier, 'utf8'));
  } catch (e) {
    echouer(`JSON illisible : ${path.relative(REPO_ROOT, fichier)} (${(e as Error).message})`);
  }
}

function lireCollections(): CollectionsVelite {
  const sortie = {} as CollectionsVelite;
  for (const nom of COLLECTIONS) {
    const donnees = lireJson(path.join(VELITE_DIR, `${nom}.json`));
    // Une collection absente ou d'une autre forme est une panne, pas une liste vide.
    if (!Array.isArray(donnees)) echouer(`.velite/${nom}.json n'est pas un tableau`);
    sortie[nom] = donnees;
  }
  return sortie;
}

/**
 * Deux dossiers dont `localizedSlugs` (ou son absence, replié sur `slug`)
 * résout à la même URL pour une locale casseraient le routage en silence :
 * `getDossierByLocalizedSlug` ne saurait plus lequel des deux rendre. Ce
 * contrôle existait déjà (`validateLocalizedSlugs`, src/lib/content.ts) mais
 * n'était appelé que dans des tests unitaires avec des fixtures synthétiques,
 * jamais sur le contenu réel ni au build. Branché ici (pas dans
 * velite.config.ts : `@/lib/content` importe des modules non triviaux et
 * `validateLocalizedSlugs` doit rester joignable AVANT que `.velite/` existe,
 * ce que seul un `require()` paresseux évite ; lire le JSON déjà écrit est
 * plus sûr), il tourne à chaque `npm run build`, donc dans le job CI
 * inconditionnel (ci.yml), pas seulement dans le content-lint gardé par des
 * filtres de chemin. Voir PR #593.
 */
function verifierLocalizedSlugs(dossierCards: CollectionsVelite['dossierCards']): void {
  const localesConnues = new Set<string>(routing.locales);
  const dossiers = dossierCards
    .filter((d) => typeof d.slug === 'string' && typeof d.locale === 'string' && localesConnues.has(d.locale))
    .map((d) => ({ slug: d.slug as string, locale: d.locale as string, localizedSlugs: d.localizedSlugs }));
  try {
    validateLocalizedSlugs(dossiers);
  } catch (e) {
    echouer((e as Error).message);
  }
}

function lireManifeste(): ManifestePrerendu {
  const m = lireJson(MANIFESTE) as Partial<ManifestePrerendu> & { version?: number };
  if (!m || typeof m.routes !== 'object' || m.routes === null) {
    echouer(`format inattendu pour .next/prerender-manifest.json (version ${m?.version ?? '?'}) : pas de clé \`routes\``);
  }
  return m as ManifestePrerendu;
}

function main(): void {
  const collections = lireCollections();
  verifierLocalizedSlugs(collections.dossierCards);
  const attendus = pagesAttendues(collections, {
    locales: routing.locales,
    scrollyAutorises: SCROLLY_ENABLED_DOSSIERS,
    // Même interpolation que `idDeVerification` (src/lib/content.ts).
    jour: (date) => `${jourISO(date)}`,
  });
  const produites = pagesProduites(lireManifeste(), (chemin) =>
    fs.existsSync(path.join(HTML_DIR, `${chemin}.html`)),
  );
  const rapport = comparer(attendus, produites);

  for (const ligne of formaterRapport(rapport)) console.log(ligne);

  const total = (champ: 'attendu' | 'produit') => rapport.lignes.reduce((n, l) => n + l[champ], 0);
  console.log(
    `\n${attendus.length} routes, ${total('attendu')} pages attendues, ${total('produit')} produites.`,
  );
  if (!rapport.ok) {
    echouer(
      'des pages de contenu manquent au build. Avec `dynamicParams = false`, elles répondraient 404 en production. ' +
        'Vérifier le `generateStaticParams` de la route en ÉCHEC, et la sortie Velite correspondante.',
    );
  }
  console.log('controle-apres-build : toutes les pages de contenu attendues ont été pré-rendues.');
}

main();
