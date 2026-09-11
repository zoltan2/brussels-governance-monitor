// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Corps de PR tel que l'éditeur le lit sur /fr/admin, en texte brut.
 *
 * Les PR ouvertes par l'assistant finissent par une ligne d'attribution
 * (« 🤖 Generated with [Claude Code](…) ») et une URL de session : du
 * balisage brut et du bruit pour l'éditeur (revue design du 2026-09-11). On
 * coupe à la ligne d'attribution ; le reste du texte est rendu tel quel.
 */
export function editorialPrBody(body: string | null | undefined): string {
  if (!body) return '';
  const lines = body.split(/\r?\n/);
  const cut = lines.findIndex((l) => /^\s*🤖\s*Generated with\b/.test(l));
  const kept = cut === -1 ? lines : lines.slice(0, cut);
  // Une URL de session seule en fin de corps, sans ligne d'attribution.
  while (kept.length > 0 && (/^\s*$/.test(kept.at(-1)!) || /^\s*https:\/\/claude\.ai\/code\/session_\S+\s*$/.test(kept.at(-1)!))) {
    kept.pop();
  }
  return kept.join('\n');
}
