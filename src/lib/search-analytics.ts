// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Mesure de la recherche (`src/components/search.tsx`), ligne de base du projet
 * Search (revue green du 29/09/2026 : la recherche n'émettait aucun événement,
 * « trouver une réponse » n'était donc pas mesurable).
 *
 * Trois événements, et JAMAIS le texte saisi, ni sa longueur exacte : une
 * requête tapée peut contenir un nom, une adresse, un problème personnel. Les
 * seules données envoyées sont celles calculées ici, toutes à valeurs fermées.
 *
 *   - `recherche-ouverte` : { origine }
 *   - `recherche-requete` : { resultats (tranche), langue }, une fois par ouverture
 *   - `recherche-clic`    : { rang, type }
 */
import { routing } from '@/i18n/routing';

/**
 * D'où le dialogue a été ouvert. `entete` : bouton de la barre large ;
 * `mobile` : loupe de l'entête mobile ; `menu` : bouton du menu mobile ;
 * `raccourci` : Ctrl/Cmd+K.
 */
export type OrigineRecherche = 'entete' | 'mobile' | 'menu' | 'raccourci';

export type TrancheResultats = '0' | '1-4' | '5+';

export type TypeResultat = 'dossier' | 'domaine' | 'secteur' | 'commune' | 'autre';

/** Nombre de résultats affichés, ramené à une tranche : jamais le nombre exact. */
export function trancheResultats(n: number): TrancheResultats {
  if (n <= 0) return '0';
  if (n < 5) return '1-4';
  return '5+';
}

/**
 * Premier segment localisé de chaque fiche détaillée, dans les 4 langues, lu dans
 * la table de routage : `/fr/domaines/…`, `/nl/domeinen/…`, `/en/municipalities/…`.
 * Lu plutôt que recopié, pour qu'un slug de route renommé ne fausse pas la mesure.
 */
const FICHES: ReadonlyArray<[keyof typeof routing.pathnames, Exclude<TypeResultat, 'autre'>]> = [
  ['/dossiers/[slug]', 'dossier'],
  ['/domains/[slug]', 'domaine'],
  ['/sectors/[slug]', 'secteur'],
  ['/communes/[slug]', 'commune'],
];

const SEGMENTS = new Map<string, Exclude<TypeResultat, 'autre'>>();
for (const [route, type] of FICHES) {
  const cible = routing.pathnames[route] as string | Record<string, string>;
  const chemins = typeof cible === 'string' ? [cible] : Object.values(cible);
  for (const chemin of chemins) {
    const segment = chemin.split('/').filter(Boolean)[0];
    if (segment) SEGMENTS.set(segment, type);
  }
}

/**
 * Type de page d'un résultat, déduit de son URL (`/fr/domaines/mobilite`).
 * Seule une fiche détaillée (langue, segment, slug) compte ; une page d'index
 * (`/fr/domaines`) ou toute autre page vaut `autre`.
 */
export function typeDeResultat(url: string): TypeResultat {
  let chemin: string;
  try {
    chemin = new URL(url, 'https://governance.brussels').pathname;
  } catch {
    return 'autre';
  }
  const segments = chemin.replace(/\.html$/, '').split('/').filter(Boolean);
  if (segments.length < 3) return 'autre';
  return SEGMENTS.get(segments[1]) ?? 'autre';
}
