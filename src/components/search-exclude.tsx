// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Retire une page de l'index de recherche du site. L'index ne lit que le
 * `<main data-pagefind-body>` du layout ; une page dont tout le contenu est
 * ignoré n'y entre pas. Constat du 2026-09-11 : des maquettes internes et des
 * pages en français publiées sous /en/, /nl/, /de/ arrivaient en tête des
 * résultats (« podcast », « magazine », « commune »).
 */
export function SearchExclude({
  when = true,
  children,
}: {
  when?: boolean;
  children: React.ReactNode;
}) {
  if (!when) return <>{children}</>;
  return <div data-pagefind-ignore="all">{children}</div>;
}
