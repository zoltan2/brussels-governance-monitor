// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Resolution of the digest's "number of the week".
 *
 * Three sources can provide it, in this order of priority:
 *
 *  1. the human edit made on `/fr/review/digest` for the *same* week, which
 *     always wins over anything computed;
 *  2. a value pinned ahead of time in `data/next-weekly-number.json`, which
 *     lets a Sunday veille set the figure *before* the draft exists — the pin
 *     is consumed on first use so it can never leak into a later week;
 *  3. the automatic suggestion derived from the first updated domain card.
 *
 * Kept as a pure function so it can be tested without the GitHub client or
 * the auth layer, which would otherwise pull the whole Next.js runtime in.
 */

export interface WeeklyNumber {
  value: string;
  label: Record<string, string>;
  source: Record<string, string>;
}

export interface PreviousDigest {
  week?: string;
  sent?: boolean;
  weeklyNumber?: WeeklyNumber;
}

export interface WeeklyNumberResolution {
  /** The value to write into the pending digest. */
  weeklyNumber: WeeklyNumber;
  /** Which of the three sources won — useful for logging and for the tests. */
  origin: 'preserved' | 'pinned' | 'suggested';
  /** True when the pin was used and must now be cleared on disk. */
  consumePin: boolean;
}

/** A pin is usable only when it carries a non-empty value. */
export function isUsablePin(pin: unknown): pin is WeeklyNumber {
  if (!pin || typeof pin !== 'object') return false;
  const value = (pin as WeeklyNumber).value;
  return typeof value === 'string' && value.trim().length > 0;
}

export function resolveWeeklyNumber(params: {
  /** The pending digest currently on disk, if any. */
  previous: PreviousDigest | null;
  /** The ISO week being prepared, e.g. "2026-w35". */
  week: string;
  /** Value pinned ahead of time, from data/next-weekly-number.json. */
  pin: unknown;
  /** Value derived from the first updated domain card. */
  suggested: WeeklyNumber;
}): WeeklyNumberResolution {
  const { previous, week, pin, suggested } = params;

  // 1. Same week, not yet sent: a human may have edited the field on the
  //    review screen. Never overwrite that.
  if (previous && previous.week === week && !previous.sent && previous.weeklyNumber) {
    return { weeklyNumber: previous.weeklyNumber, origin: 'preserved', consumePin: false };
  }

  // 2. A figure pinned in advance for this upcoming digest.
  if (isUsablePin(pin)) {
    return { weeklyNumber: pin, origin: 'pinned', consumePin: true };
  }

  // 3. Fall back to the automatic suggestion.
  return { weeklyNumber: suggested, origin: 'suggested', consumePin: false };
}
