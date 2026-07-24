// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

export const FILTERABLE_SECTIONS = [
  'domains',
  'sectors',
  'communes',
  'dossiers',
  'solutions',
  'comparisons',
] as const;

export type FilterableSection = (typeof FILTERABLE_SECTIONS)[number];

export function isFilterableSection(
  value: string | undefined | null,
): value is FilterableSection {
  return !!value && (FILTERABLE_SECTIONS as readonly string[]).includes(value);
}
