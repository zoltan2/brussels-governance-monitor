// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// De la fiche à la clé de thème d'abonnement. Module PUR, sans import : il est
// lu par les pages, par `@/lib/content` et par `@/lib/resend`. Ne jamais y
// importer l'un des deux (garde `src/components/client-bundle-boundary.test.ts`).

export type TypeDeFiche = 'domain' | 'sector' | 'dossier' | 'commune';

/** Trois dossiers gardent une clé plus courte que leur slug : des abonnés la portent. */
export const DOSSIER_SLUG_TO_TOPIC: Record<string, string> = {
  'seniors-a-bruxelles': 'dossier-seniors',
  'data-centers-ia-energie': 'dossier-data-centers',
  'faillites-a-bruxelles': 'dossier-faillites',
};

export function cleDeTheme(type: TypeDeFiche, slug: string): string {
  if (type === 'dossier') return DOSSIER_SLUG_TO_TOPIC[slug] || `dossier-${slug}`;
  if (type === 'commune') return `commune-${slug}`;
  return slug;
}
