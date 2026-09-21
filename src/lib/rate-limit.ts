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
const MAX_ENTRIES = 10_000;

export function rateLimit(
  ip: string,
  opts: { max?: number; bucket?: string; windowMs?: number } = {},
): { allowed: boolean; remaining: number } {
  const max = opts.max ?? MAX_REQUESTS;
  const windowMs = opts.windowMs ?? WINDOW_MS;
  const key = opts.bucket ? `${opts.bucket}:${ip}` : ip;
  const now = Date.now();
  const entry = store.get(key);

  if (store.size > MAX_ENTRIES) {
    for (const [k, val] of store) {
      if (val.resetAt < now) store.delete(k);
    }
    // La purge ci-dessus ne libere QUE des entrees expirees. Avec une fenetre
    // longue (quota journalier) ou un flot d'adresses distinctes — un prefixe
    // IPv6 /64 en fournit autant qu'on veut — elle peut ne rien liberer du tout,
    // et la carte croit alors sans borne jusqu'a l'epuisement du tas.
    // On impose donc un plafond dur, en evinçant les entrees qui expirent le
    // plus tot : un abus perd son compteur, jamais la memoire du processus.
    if (store.size > MAX_ENTRIES) {
      const parExpiration = [...store.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
      for (const [k] of parExpiration.slice(0, store.size - MAX_ENTRIES)) store.delete(k);
    }
  }

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  entry.count++;

  if (entry.count > max) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: max - entry.count };
}
