// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { SearchExclude } from '@/components/search-exclude';

/**
 * Etape du parcours d'abonnement : hors de l'index de recherche INTERNE, et
 * hors des moteurs.
 *
 * `SearchExclude` pose `data-pagefind-ignore`, qui n'exclut que Pagefind. Ces
 * quatre pages etaient donc indexables par Google : pas de `robots`, pas de
 * canonique, un titre par defaut sans specificite, et un hreflang herite de la
 * page d'accueil. Trois d'entre elles lisent en plus des parametres de requete,
 * ce qui multiplie les variantes crawlables — et l'URL de `preferences` porte un
 * jeton d'abonne valable un an (audit 21/09).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SearchExclude>{children}</SearchExclude>;
}
