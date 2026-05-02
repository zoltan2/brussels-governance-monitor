// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Allowlist of dossier slugs that have a scrolly (immersive) view.
 *
 * Single source of truth for the feature. Used by:
 * - The scrolly route handler (404 if slug not in this set)
 * - The structured dossier page (conditionally renders the "Vue immersive" CTA)
 * - The sitemap generator (excludes scrolly URLs regardless, but the allowlist
 *   defines what would be included if we ever change that)
 *
 * Adding a new dossier: add the slug here AND ensure the editor has migrated
 * the MDX to use density wrappers (<Essentiel>, <Complet>, etc.) for the
 * scrolly view to be meaningful.
 *
 * Spec: bgm-ops/specs/2026-05-02-option-d-scrolly-cpas-pilot.md §3.4
 */
export const SCROLLY_ENABLED_DOSSIERS: ReadonlySet<string> = new Set(['cpas-bruxellois']);

export function isScrollyEnabled(slug: string | null | undefined): boolean {
  if (typeof slug !== 'string') return false;
  return SCROLLY_ENABLED_DOSSIERS.has(slug);
}
