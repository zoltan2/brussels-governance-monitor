// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/** Banner stays visible for this many calendar days after the change. */
export const WHATCHANGED_MAX_AGE_DAYS = 30;

/**
 * Whole calendar days between an ISO date (date-only or datetime) and `now`.
 * Both ends are normalized to UTC midnight so an SSG build in UTC and a reader
 * in Brussels never disagree by a day. `now` is injectable for deterministic tests.
 */
export function daysSince(dateStr: string, now: Date = new Date()): number {
  const d = new Date(dateStr);
  const then = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - then) / 86_400_000);
}
