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
  'public/pagefind/',
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
 * Sous `public/pagefind/`, filtrer par EXTENSION ne marche pas : le dépôt y
 * contient six `.js` légitimes (`pagefind.js` et consorts), et
 * `src/components/search.tsx:53` fait `import('/pagefind/pagefind.js')` dès
 * qu'un visiteur ouvre la recherche. Autoriser `.js` laisserait donc servir
 * du JavaScript arbitraire depuis l'origine principale, sous une CSP
 * `script-src 'self'` parfaitement satisfaite. Les artefacts JS sont donc
 * nommés un par un.
 */
const PAGEFIND_DATA = /\.(pf_fragment|pf_index|pf_meta)$/;
// Les cinq `.pagefind` légitimes sont des binaires wasm, un par langue. Le
// suffixe seul acceptait `evil.js.pagefind` : on nomme donc la forme entière.
const PAGEFIND_WASM = /^public\/pagefind\/wasm\.[a-z_]+\.pagefind$/;
const PAGEFIND_NAMED = new Set([
  'public/pagefind/pagefind.js',
  'public/pagefind/pagefind-ui.js',
  'public/pagefind/pagefind-ui.css',
  'public/pagefind/pagefind-modular-ui.js',
  'public/pagefind/pagefind-modular-ui.css',
  'public/pagefind/pagefind-component-ui.js',
  'public/pagefind/pagefind-component-ui.css',
  'public/pagefind/pagefind-highlight.js',
  'public/pagefind/pagefind-worker.js',
  'public/pagefind/pagefind-entry.json',
]);

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
    if (p.startsWith('public/pagefind/')) {
      return PAGEFIND_DATA.test(p) || PAGEFIND_WASM.test(p) || PAGEFIND_NAMED.has(p);
    }
    return true;
  });
}
