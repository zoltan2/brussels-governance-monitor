// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * ⚠️ Cette liste blanche limite le RAYON D'ACTION d'une veille légitime.
 * Ce n'est PAS une frontière de sécurité : `content/**` est compilé par
 * Velite puis évalué par `new Function` (`src/components/mdx-content.tsx:98`,
 * avec `unsafe-eval` accordé dans `next.config.ts:53`). Fusionner du contenu,
 * c'est exécuter du code. La vraie garde est « d'où vient cette PR » —
 * `headRepo === repo` dans la route. Ne pas durcir ceci en croyant fermer ce
 * trou-là.
 */

/** Préfixes qu'une veille a le droit de toucher. Volontairement courte. */
export const ALLOWED_PREFIXES = [
  'content/',
  'messages/',
] as const;

/**
 * Sous `data/`, on autorise nommément les trois fichiers qu'une veille
 * alimente réellement — vérifié sur la PR #387 — et rien d'autre. Un
 * préfixe `data/` entier laisserait passer `data/pending-digest.json`, qui
 * pilote l'email envoyé aux abonnés en onze langues.
 */
export const ALLOWED_DATA_FILES = [
  'data/radar.json',
  'data/commitments.json',
  'data/changelog.json',
] as const;

/**
 * `.github/` est absent exprès : un workflow modifié s'exécuterait.
 *
 * `public/pagefind/` aussi, depuis la PR #461 : l'index de recherche n'est
 * plus suivi par git, l'image Docker le génère. Une PR qui y ajoute un
 * fichier le force hors du `.gitignore`, ce qu'aucune veille ne fait. Le
 * refuser ferme en même temps le risque d'un `.js` arbitraire servi depuis
 * `/pagefind/`, que `src/components/search.tsx` importe à l'ouverture de la
 * recherche.
 */

/**
 * Message décrivant pourquoi cet ensemble est refusé, ou `null` s'il passe.
 *
 * Écrit UNE fois et consommé par la route de fusion comme par la
 * page-décision : sans cela l'écran annonçait « Prêt à publier », bouton
 * actif, et la route répondait 403 au clic. Un verdict qui ne dit pas la même
 * chose que le serveur ne vaut rien.
 *
 * Nommer les coupables : un refus aveugle sur une PR de 1480 fichiers est
 * indiagnosticable. On en cite cinq au plus, le reste est compté.
 */
export function fileSetRefusal(paths: string[]): string | null {
  if (isMergeableFileSet(paths)) return null;
  // `isMergeableFileSet` reste l'autorité : c'est elle qui refuse aussi
  // l'ensemble vide, cas où il n'y a aucun chemin à nommer.
  const rejected = paths.filter((p) => !isMergeableFileSet([p]));
  if (rejected.length === 0) return 'La PR ne touche aucun fichier';
  return `Fichiers hors périmètre : ${rejected.slice(0, 5).join(', ')}${
    rejected.length > 5 ? ` (et ${rejected.length - 5} autres)` : ''
  }`;
}

export function isMergeableFileSet(paths: string[]): boolean {
  if (paths.length === 0) return false;

  return paths.every((p) => {
    if (p.includes('..') || p.startsWith('/') || p.includes('\\')) return false;
    if ((ALLOWED_DATA_FILES as readonly string[]).includes(p)) return true;
    if (!ALLOWED_PREFIXES.some((prefix) => p.startsWith(prefix))) return false;
    // `messages/` sert des traductions JSON et rien d'autre : sans cette
    // restriction, `messages/evil.js` passait.
    if (p.startsWith('messages/') && !/^messages\/[^/]+\.json$/.test(p)) return false;
    return true;
  });
}
