// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { z } from 'zod';
import rawData from '../../data/commitments.json';

// ── Shared ──────────────────────────────────────────────────────────────────

const i18nString = z.object({
  fr: z.string().min(1),
  nl: z.string().min(1),
  en: z.string().min(1),
  de: z.string().min(1),
});

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const statusHistoryEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  // Existing values in data. Ontological rename (declared/active/…) is tracked in
  // bgm-ops/specs/2026-05-08-ontology-formalization-audit.md NEXT-08.
  status: z.enum(['not-started', 'announced', 'in-legislation', 'implemented', 'delayed']),
  source: z.string().min(1),
});

const dataPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  value: z.number(),
  unit: z.string().min(1),
  source: z.string().min(1),
});

const ministerSchema = z.object({
  name: z.string().min(1),
  portfolio: i18nString,
});

// ── Main commitment schema (exported for testing) ────────────────────────────

export const commitmentSchema = z.object({
  id: z.string().min(1),
  // All 13 DomainIds — matches src/lib/entities.ts DomainId type.
  domain: z.enum([
    'budget', 'mobility', 'housing', 'employment', 'climate', 'social',
    'security', 'economy', 'cleanliness', 'institutional', 'urban-planning',
    'digital', 'education',
  ]),
  target: i18nString,
  indicator: i18nString,
  description: i18nString,
  baseline: i18nString,
  deadline: z.string().min(1),
  chapter: z.number().int().positive(),
  minister: ministerSchema,
  statusHistory: z.array(statusHistoryEntrySchema).min(1),
  dataPoints: z.array(dataPointSchema).optional(),
});

const commitmentsFileSchema = z.object({
  lastModified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().min(1),
  sourceUrl: z.string().url(),
  commitments: z.array(commitmentSchema).min(1),
});

// ── Parsed & validated at module load ────────────────────────────────────────

const parsed = commitmentsFileSchema.parse(rawData);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Commitment = z.infer<typeof commitmentSchema>;
export type StatusHistoryEntry = z.infer<typeof statusHistoryEntrySchema>;
export type DataPoint = z.infer<typeof dataPointSchema>;

// ── Public API ────────────────────────────────────────────────────────────────

export function getCommitments(): Commitment[] {
  return parsed.commitments;
}

export function getCommitmentById(id: string): Commitment | undefined {
  return parsed.commitments.find((c) => c.id === id);
}
