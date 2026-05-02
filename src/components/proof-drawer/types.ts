// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

export type ProofSourceType = 'primary' | 'analysis' | 'relay' | 'contested';

export type ProofStatus = 'stable' | 'confirmed_declared' | 'projection_pending' | 'contested';

export type RevisionBadge = 'initial' | 'update' | 'alert' | 'expected';

export type Tab = 'narrative' | 'data' | 'histoire';

export interface ProofSource {
  label: string;
  url: string;
  type: ProofSourceType;
  description?: string;
  accessedAt?: string;
}

export interface Revision {
  date: string;
  badge: RevisionBadge;
  title: string;
  description: string;
  oldRobustness?: number;
  newRobustness?: number;
}

export interface Metric {
  label: string;
  value: string;
  unit?: string;
  source?: string;
  url?: string;
  date: string;
  id?: string;
  claim?: string;
  robustness?: number;
  proofStatus?: ProofStatus;
  bgmAlert: boolean;
  alertText?: string;
  nextUpdate?: string;
  proofSources: ProofSource[];
  revisions: Revision[];
}

export interface InstrumentedMetric extends Metric {
  id: string;
  claim: string;
}

export function isInstrumented(metric: Metric): metric is InstrumentedMetric {
  return !!metric.id && !!metric.claim && metric.proofSources.length > 0;
}
