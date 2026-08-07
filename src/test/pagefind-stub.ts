// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Bouchon pour `/pagefind/pagefind.js`, généré au build dans `public/` et donc
// absent en test. Vite refuse d'importer un fichier de `public/` : l'alias
// déclaré dans `vitest.config.ts` renvoie ici.
export function init() {}
export async function search() {
  return { results: [] };
}
