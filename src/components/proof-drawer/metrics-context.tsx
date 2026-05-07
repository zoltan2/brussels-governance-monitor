// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { Metric } from './types';
import { parseProofHash } from './parse-proof-hash';

const MetricsContext = createContext<Metric[]>([]);

interface MetricsProviderProps {
  metrics: Metric[];
  children: ReactNode;
}

/**
 * Provides metrics to descendant `<Claim>` components and orchestrates the
 * deep-link hash → drawer activation on mount.
 *
 * Hash validation flow (3 layers, fail-closed — see spec §4.2):
 *   1. parseProofHash() validates syntax (regex + tab allowlist).
 *   2. metrics.find() validates id exists in current dossier's data.
 *   3. document.querySelector(first match) dispatches a custom event on the
 *      first matching `[data-proof="..."]` trigger. Other instances stay closed.
 *
 * If layer 1 or 2 fails, the hash is silently removed from the URL via
 * history.replaceState — no broken URL stays in the address bar to be re-shared.
 */
export function MetricsProvider({ metrics, children }: MetricsProviderProps) {
  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (!hash) return;

    const cleanUrl = () => {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    };

    // Layer 1 — syntax validation
    const parsed = parseProofHash(hash);
    if (!parsed) {
      cleanUrl();
      return;
    }

    // Layer 2 — data existence check
    const metric = metrics.find((m) => m.id === parsed.id);
    if (!metric) {
      cleanUrl();
      return;
    }

    // Layer 3 — DOM dispatch on FIRST matching trigger only.
    // id has already been validated against `[a-z0-9-]{1,40}` regex AND confirmed
    // in metrics array — safe to interpolate as attribute selector value.
    // If an extension of the regex accepts new characters (e.g. underscore),
    // re-verify that no character could break `[data-proof="..."]` (only `"` would,
    // already excluded by the current regex).
    const target = document.querySelector(`[data-proof="${parsed.id}"]`);
    if (target) {
      target.dispatchEvent(
        new CustomEvent('proof:open', { detail: { tab: parsed.tab }, bubbles: false }),
      );
    }
  }, [metrics]);

  return <MetricsContext.Provider value={metrics}>{children}</MetricsContext.Provider>;
}

export function useMetrics(): Metric[] {
  return useContext(MetricsContext);
}
