// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { SearchExclude } from '@/components/search-exclude';

/** Étape du parcours d'abonnement : hors de l'index de recherche. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SearchExclude>{children}</SearchExclude>;
}
