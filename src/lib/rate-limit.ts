// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Simple in-memory rate limiter for API routes.
 * Tracks requests per IP with a sliding window.
 */

const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5; // default: 5 requests per minute per IP

/**
 * Per-IP sliding-window rate limiter.
 * @param ip caller IP (falls back to 'unknown' upstream)
 * @param opts.max per-minute request cap (default 5)
 * @param opts.bucket optional namespace — keeps route-specific counters independent;
 *                    without it all callers share a single IP bucket.
 */
export function rateLimit(
  ip: string,
  opts: { max?: number; bucket?: string } = {},
): { allowed: boolean; remaining: number } {
  const max = opts.max ?? MAX_REQUESTS;
  const key = opts.bucket ? `${opts.bucket}:${ip}` : ip;
  const now = Date.now();
  const entry = store.get(key);

  // Clean up expired entries periodically
  if (store.size > 10_000) {
    for (const [k, val] of store) {
      if (val.resetAt < now) store.delete(k);
    }
  }

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: max - 1 };
  }

  entry.count++;

  if (entry.count > max) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: max - entry.count };
}
