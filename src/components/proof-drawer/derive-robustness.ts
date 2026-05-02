// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metric, ProofStatus } from './types';

const STATUS_BASE: Record<ProofStatus, number> = {
  stable: 85,
  confirmed_declared: 80,
  projection_pending: 60,
  contested: 45,
};

const NEUTRAL_BASE = 60;

/**
 * Computes the robustness score (0-100) for a metric.
 *
 * PRECEDENCE RULE: if `metric.robustness` is provided explicitly by the editor,
 * it is used as-is (clamped defensively). The formula below is ONLY a fallback
 * for metrics where no explicit override exists.
 *
 * Formula (fallback, when robustness is omitted):
 *   base = STATUS_BASE[proofStatus] ?? 60
 *   + 5 per `proofSources` of type 'primary' (cap +10)
 *   - 10 if `proofSources` contains at least one entry of type 'contested'
 *   - 5 if `bgmAlert === true`
 *   clamped to [0, 100]
 */
export function deriveRobustness(
  metric: Pick<Metric, 'robustness' | 'proofStatus' | 'bgmAlert' | 'proofSources'>,
): number {
  if (typeof metric.robustness === 'number') {
    return clamp(metric.robustness);
  }

  const base = metric.proofStatus ? STATUS_BASE[metric.proofStatus] : NEUTRAL_BASE;
  const primaryCount = metric.proofSources.filter((src) => src.type === 'primary').length;
  const hasContested = metric.proofSources.some((src) => src.type === 'contested');

  let score = base + Math.min(5 * primaryCount, 10);
  if (hasContested) score -= 10;
  if (metric.bgmAlert) score -= 5;

  return clamp(score);
}

/**
 * Returns a Tailwind text color class for the robustness score.
 * Aligns with BGM palette (no red/green).
 */
export function robustnessColorClass(score: number): string {
  if (score >= 80) return 'text-teal-600';
  if (score >= 65) return 'text-amber-600';
  return 'text-rose-600';
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));
