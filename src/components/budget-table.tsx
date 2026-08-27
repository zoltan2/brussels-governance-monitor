// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { parseBudget, statusLabel, type BudgetConfidence, type BudgetLabels } from '@/lib/budget';

export type BudgetTableLabels = BudgetLabels & {
  /** Badge for an estimated amount. Convention: `(est.)`. */
  estimated: string;
  /** Badge for an amount still to be confirmed. Convention: `(à confirmer)`. */
  unconfirmed: string;
};

type Variant = 'budget' | 'inaction';

type Props = {
  heading: string;
  value: unknown;
  labels: BudgetTableLabels;
  variant?: Variant;
};

const SURFACE: Record<Variant, string> = {
  budget: 'border-neutral-150 bg-neutral-50/60 divide-neutral-150',
  inaction: 'border-amber-200 bg-amber-50/50 divide-amber-200',
};

const AMOUNT: Record<Variant, string> = {
  budget: 'text-brand-900',
  inaction: 'text-amber-800',
};

/**
 * Confidence badge, per the BGM convention: `official` carries no badge at all,
 * so the absence of a marker reads as "verified". Badging everything would
 * dilute the signal.
 */
function ConfidenceBadge({
  confidence,
  labels,
}: {
  confidence: BudgetConfidence;
  labels: BudgetTableLabels;
}) {
  if (confidence === 'official') return null;

  const isEstimate = confidence === 'estimated';
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-xs font-normal uppercase tracking-wide ${
        isEstimate ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      {isEstimate ? labels.estimated : labels.unconfirmed}
    </span>
  );
}

/**
 * A single short amount ("~5,2 milliards EUR") is a KPI and is typeset as one.
 * Anything longer is a sentence, and typesetting a sentence as an amount is the
 * defect this component exists to fix. The threshold is deliberately blunt:
 * multi-figure content belongs in the structured `BudgetLine[]` form instead.
 */
const AMOUNT_SHAPED_MAX_LENGTH = 64;

function isAmountShaped(text: string): boolean {
  return text.length <= AMOUNT_SHAPED_MAX_LENGTH;
}

export function BudgetTable({ heading, value, labels, variant = 'budget' }: Props) {
  const parsed = parseBudget(value);
  if (!parsed) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {heading}
      </h2>

      {parsed.kind === 'text' &&
        (isAmountShaped(parsed.text) ? (
          <p className={`max-w-2xl text-base font-semibold ${AMOUNT[variant]}`}>{parsed.text}</p>
        ) : (
          <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">{parsed.text}</p>
        ))}

      {parsed.kind === 'status' && (
        <div className="max-w-2xl">
          <p className="text-sm text-neutral-500">{statusLabel(parsed.status, labels)}</p>
          {parsed.reason && (
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">{parsed.reason}</p>
          )}
        </div>
      )}

      {parsed.kind === 'lines' && (
        <dl className={`max-w-2xl divide-y rounded-lg border ${SURFACE[variant]}`}>
          {parsed.lines.map((line) => (
            <div key={`${line.label}-${line.value}`} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm leading-snug text-neutral-600">{line.label}</dt>
                <dd
                  className={`flex shrink-0 items-baseline gap-2 text-sm font-semibold tabular-nums ${AMOUNT[variant]}`}
                >
                  <span>{line.value}</span>
                  <ConfidenceBadge confidence={line.confidence} labels={labels} />
                </dd>
              </div>
              {line.note && (
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">{line.note}</p>
              )}
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
