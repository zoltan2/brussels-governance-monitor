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
            // `dt` et `dd` doivent être enfants DIRECTS du div enveloppe : le second
            // div intercalé faisait échouer dlitem et definition-list (12 occurrences
            // mesurées par axe). La mise en page passe donc sur le div de rangée.
            <div
              key={`${line.label}-${line.value}`}
              className="flex flex-wrap items-baseline justify-between gap-x-4 px-4 py-3"
            >
              <dt className="text-sm leading-snug text-neutral-600">{line.label}</dt>
              {/* La note vit DANS le <dd>. Un <p> frère de dt/dd rompt la règle
                  « dl > div ne contient que des groupes dt/dd » (axe definition-list) ;
                  le masquer en aria-hidden ne corrigeait pas la structure, cela ne
                  faisait que la soustraire au contrôle. */}
              <dd
                className={`flex min-w-0 flex-col items-end gap-1 text-sm font-semibold tabular-nums ${AMOUNT[variant]}`}
              >
                <span className="flex items-baseline gap-2">
                  <span>{line.value}</span>
                  <ConfidenceBadge confidence={line.confidence} labels={labels} />
                </span>
                {line.note && (
                  <p className="text-right text-xs font-normal leading-relaxed text-neutral-500">
                    {line.note}
                  </p>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
