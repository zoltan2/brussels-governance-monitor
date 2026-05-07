// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import type { ReactNode } from 'react';
import { useMetrics } from '@/components/proof-drawer/metrics-context';
import { isInstrumented } from '@/components/proof-drawer/types';
import { ProofDrawerTrigger } from '@/components/proof-drawer/proof-drawer-trigger';

interface ClaimProps {
  id: string;
  children: ReactNode;
}

/**
 * MDX component used as `<Claim id="cpas-234-vs-300">300 M€</Claim>`.
 *
 * Reads the dossier's metrics from MetricsContext, finds the metric matching
 * `id`, and renders an instrumented inline trigger + collocated drawer.
 *
 * If the id has no matching instrumented metric (typo, deleted, draft,
 * non-CPAS dossier), renders children as plain text. Silent fallback —
 * never throws, never blocks the page.
 *
 * In development, logs a warning when a Claim references an unknown id, to
 * help editors catch typos before publishing.
 */
export function Claim({ id, children }: ClaimProps) {
  const metrics = useMetrics();
  const metric = metrics.find((m) => m.id === id);

  if (!metric || !isInstrumented(metric)) {
    if (process.env.NODE_ENV === 'development' && metrics.length > 0) {
      console.warn(
        `[Claim] id "${id}" not found among instrumented metrics in current dossier. Falling back to plain text.`,
      );
    }
    return <>{children}</>;
  }

  return <ProofDrawerTrigger metric={metric}>{children}</ProofDrawerTrigger>;
}
