// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Gardes de la page de relecture du quiz.
 *
 * Volontairement séparées de `src/lib/mergeable-files.ts` et de
 * `src/lib/github-pr.ts`, qui gouvernent la publication de la veille. Élargir
 * ces listes partagées donnerait au pipeline de veille — piloté par un LLM —
 * le droit d'écrire dans les pools de quiz, donc de faire disparaître la
 * mention de l'article 50 sans qu'aucune relecture ait eu lieu. Le fichier
 * `mergeable-files.ts` nomme lui-même le précédent : un préfixe `data/` entier
 * laisserait passer `data/pending-digest.json`, qui pilote l'email des
 * abonnés en onze langues.
 *
 * Module pur : aucun accès réseau, aucun accès disque, testable seul.
 */

import { LOCALES, type Locale } from './quiz-review';

/** Toute branche de relecture porte ce préfixe, et rien d'autre ne le porte. */
export const QUIZ_REVIEW_BRANCH_PREFIX = 'review/quiz-';

export const REVIEW_STATE_PATH = 'data/quiz-review-state.json';

/** Table constante : un chemin de pool ne se construit jamais par
 *  interpolation d'une valeur reçue. */
const POOL_PATHS: Record<Locale, string> = {
  fr: 'public/quiz-data-fr.json',
  nl: 'public/quiz-data-nl.json',
  en: 'public/quiz-data-en.json',
  de: 'public/quiz-data-de.json',
};

export function poolPathFor(locale: Locale): string {
  return POOL_PATHS[locale];
}

/** Les cinq seuls fichiers qu'une PR de relecture peut toucher. */
export const QUIZ_REVIEW_PATHS: readonly string[] = [
  REVIEW_STATE_PATH,
  ...LOCALES.map((l) => POOL_PATHS[l]),
];

/**
 * Étiquette écrite dans `reviewedBy`, pour les quatre locales.
 *
 * Une CONSTANTE, et surtout pas l'adresse de la session : ce champ atterrit
 * dans `data/quiz-review-state.json`, versionné dans un dépôt PUBLIC. Une
 * adresse e-mail y serait publiée dans l'historique git, donc définitivement.
 * La valeur reprend celle des 269 entrées déjà écrites par le CLI, pour que le
 * champ reste homogène d'un chemin d'écriture à l'autre.
 */
export const REVIEWER_LABEL = 'zoltan';

export interface FileSha {
  path: string;
  sha: string;
}

export interface ShaRefusal {
  error: string;
  files: string[];
}

/**
 * Concurrence optimiste sur les cinq blobs.
 *
 * Un sha ABSENT est refusé au même titre qu'un sha qui a bougé. La version
 * précédente conditionnait la comparaison à la présence de la clé : un corps
 * sans `shas` — que le schéma accepte, `z.record` admettant l'objet vide —
 * sautait la garde entière et réécrivait les quatre pools. Git n'aurait rien
 * signalé, le commit étant un descendant de `main`.
 *
 * Les deux causes sont distinguées parce qu'elles ne se corrigent pas de la
 * même façon : rechargez la page contre corrigez l'appelant.
 */
export function shaRefusal(
  files: FileSha[],
  shas: Record<string, string>,
): ShaRefusal | null {
  const manquants = files.filter((f) => !shas[f.path]).map((f) => f.path);
  if (manquants.length > 0) {
    return { error: 'Sha de référence manquant', files: manquants };
  }
  const bouges = files.filter((f) => shas[f.path] !== f.sha).map((f) => f.path);
  if (bouges.length > 0) {
    return { error: 'Contenu modifié depuis le chargement', files: bouges };
  }
  return null;
}

export interface CheckState {
  passed: number;
  pending: number;
  failed: string[];
  /** Nombre de runs connus pour ce sha. Zéro n'est pas un feu vert. */
  total: number;
}

/**
 * Refus lisible sur l'état des contrôles.
 *
 * `total === 0` est un refus, pas un feu vert : entre la création de la PR et
 * l'inscription du premier run par GitHub, il s'écoule quelques secondes
 * pendant lesquelles « aucun échec » est vrai et ne veut rien dire.
 *
 * L'échec prime sur l'attente : « en cours » invite à réessayer, alors qu'une
 * PR qui porte déjà un échec est condamnée quoi qu'il arrive ensuite.
 */
export function checkStateRefusal(checks: CheckState): string | null {
  if (checks.failed.length > 0) {
    return `Contrôles en échec : ${checks.failed.join(', ')}`;
  }
  if (checks.total === 0) {
    return 'Contrôles non démarrés';
  }
  if (checks.pending > 0) {
    return 'Contrôles en cours';
  }
  return null;
}

export interface PrRef {
  branch: string;
  headRepo: string | null;
  baseRef: string;
}

export interface OpenReviewPr {
  number: number;
  branch: string;
}

export function branchRefusal(branch: string): string | null {
  if (!branch.startsWith(QUIZ_REVIEW_BRANCH_PREFIX)) {
    return `Branche hors périmètre : ${branch}`;
  }
  if (branch.length === QUIZ_REVIEW_BRANCH_PREFIX.length) {
    return 'Branche hors périmètre : le préfixe seul ne suffit pas';
  }
  return null;
}

/**
 * Refus opposé à une PR avant fusion.
 *
 * La garde décisive est `headRepo` : sur une PR ouverte depuis un fork, le nom
 * de branche est choisi par son auteur, donc un inconnu peut imiter n'importe
 * quel préfixe. `null` signale un fork supprimé, cas également refusé.
 */
export function prRefusal(pr: PrRef, repo: string): string | null {
  if (pr.headRepo !== repo) {
    return `PR issue d'un autre dépôt : ${pr.headRepo ?? 'dépôt supprimé'}`;
  }
  if (pr.baseRef !== 'main') {
    return `PR dont la base n'est pas main : ${pr.baseRef}`;
  }
  return branchRefusal(pr.branch);
}

export interface PrFileSet {
  paths: string[];
  /** Vrai quand GitHub a pu en cacher : la liste n'est plus concluante. */
  truncated: boolean;
}

/**
 * Liste blanche fermée des cinq chemins.
 *
 * `truncated` est refusé AVANT tout examen des chemins : une liste blanche qui
 * cesse de regarder n'en est plus une. Un chemin hors périmètre au-delà du
 * plafond de l'API serait invisible, et tout ce qu'on aurait vu étant licite,
 * la fusion passerait.
 *
 * Le drapeau est un paramètre et non un appel séparé pour qu'on ne puisse pas
 * l'oublier : la garde ne se laisse pas invoquer à moitié.
 */
export function fileSetRefusal(files: PrFileSet): string | null {
  if (files.truncated) {
    return 'Liste des fichiers tronquée : le périmètre ne peut pas être vérifié';
  }
  if (files.paths.length === 0) {
    return 'Aucun fichier : une PR de relecture vide n’a rien à fusionner';
  }
  const outside = files.paths.filter((p) => !QUIZ_REVIEW_PATHS.includes(p));
  if (outside.length > 0) {
    return `Fichiers hors périmètre : ${outside.join(', ')}`;
  }
  return null;
}

/**
 * Une seule session de relecture ouverte à la fois.
 *
 * Deux branches issues du même `main` réécrivent toutes deux
 * `data/quiz-review-state.json` en entier. Git ne voit aucun conflit tant
 * qu'aucune n'est fusionnée, les contrôles passent au vert sur les deux, puis
 * la seconde fusion casse — et la résolution manuelle évidente, garder un
 * côté, jette un lot entier de décisions humaines.
 */
export function secondSessionRefusal(open: OpenReviewPr[]): string | null {
  if (open.length === 0) return null;
  const numbers = open.map((p) => `#${p.number}`).join(', ');
  return `Une session de relecture est déjà ouverte (${numbers}). Fusionnez-la avant d'en commencer une autre.`;
}

/**
 * Message de commit, construit de constantes et de compteurs uniquement.
 *
 * Aucun texte saisi par l'utilisateur n'y entre : un `[skip ci]` glissé dans
 * une note désactiverait les workflows en silence — la relecture serait
 * enregistrée et rien ne serait déployé — et un saut de ligne permettrait de
 * forger des lignes de trailer dans l'historique public.
 */
export function commitMessageFor(counts: {
  approved: number;
  rejected: number;
  notes?: string[];
}): string {
  const parts = [`${counts.approved} approuvée(s)`, `${counts.rejected} retirée(s)`];
  return `content(quiz): relecture — ${parts.join(', ')}`;
}
