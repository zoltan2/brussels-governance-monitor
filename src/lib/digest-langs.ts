// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/** The 4 core locales; their presence defines a "complete" digest week. */
export const CORE_DIGEST_LOCALES = ['fr', 'nl', 'en', 'de'] as const;

export interface RecentDigestLangs {
  /** Flat, deduped list of langs (the component orders/partitions). */
  langs: string[];
  /** Most recent complete week key (e.g. "2026-w26"), or null if none. */
  latestCompleteWeek: string | null;
}

/**
 * `{N}` and the language set for the Publications band.
 *
 * A week is "complete" when all 4 core locales are present (the publication
 * anchor). We take the UNION of langs over the `windowSize` most recent complete
 * weeks — union (not intersection) so a language that skips one week during
 * incremental publishing still counts. NOTE: this is intentionally NOT monotone —
 * a language that stops being published drops after ≤ windowSize complete weeks.
 * That is honest ("currently publishing in"); do NOT "fix" it with a monotone max.
 *
 * Pure function (entries in → result out) so it is unit-testable without Velite.
 */
export function computeRecentDigestLangs(
  entries: ReadonlyArray<{ week: string; lang: string }>,
  windowSize = 2,
): RecentDigestLangs {
  const langsByWeek = new Map<string, Set<string>>();
  for (const { week, lang } of entries) {
    if (!langsByWeek.has(week)) langsByWeek.set(week, new Set());
    langsByWeek.get(week)!.add(lang);
  }

  const completeWeeksDesc = [...langsByWeek.entries()]
    .filter(([, langs]) => CORE_DIGEST_LOCALES.every((c) => langs.has(c)))
    .map(([week]) => week)
    .sort()
    .reverse();

  if (completeWeeksDesc.length === 0) {
    return { langs: [], latestCompleteWeek: null };
  }

  const selected = completeWeeksDesc.slice(0, windowSize);
  const union = new Set<string>();
  for (const week of selected) {
    for (const lang of langsByWeek.get(week)!) union.add(lang);
  }

  return { langs: [...union].sort(), latestCompleteWeek: completeWeeksDesc[0]! };
}
