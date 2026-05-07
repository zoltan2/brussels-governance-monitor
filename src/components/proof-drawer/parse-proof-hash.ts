// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Tab } from './types';

const TAB_ALLOWLIST = new Set<Tab>(['narrative', 'data', 'histoire']);

const HASH_PATTERN = /^#proof-([a-z0-9-]{1,40}):(narrative|data|histoire)$/;

export interface ParsedProofHash {
  id: string;
  tab: Tab;
}

/**
 * Parses a URL hash into a structured proof drawer state.
 *
 * Security guarantees (3-layer fail-closed validation, this is layer 1):
 * - The id is extracted via regex match, NEVER passed to a DOM selector at this stage.
 * - The id length is capped at 40 chars (DoS prevention).
 * - The id character class `[a-z0-9-]` forbids `<`, `>`, `"`, `'`, etc.
 * - The tab is constrained to the allowlist by the regex itself, plus a Set
 *   check (belt and suspenders).
 *
 * Returns `{ id, tab }` if syntax is valid, else `null`. The caller MUST then
 * verify `id` exists in the loaded metrics via `metrics.find()` (layer 2). Only
 * after both layers pass may the validated `id` be used as a CSS attribute
 * selector value (layer 3, see proof drawer component for first-match dispatch).
 *
 * Null/undefined input (defensive): typeof check returns null early.
 */
export function parseProofHash(hash: string | null | undefined): ParsedProofHash | null {
  if (typeof hash !== 'string') return null;
  const match = hash.match(HASH_PATTERN);
  if (!match) return null;
  const [, id, tab] = match;
  if (!TAB_ALLOWLIST.has(tab as Tab)) return null;
  return { id, tab: tab as Tab };
}
