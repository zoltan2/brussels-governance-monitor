// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { daysSince, WHATCHANGED_MAX_AGE_DAYS } from '@/lib/freshness';

interface WhatChangedBannerLabels {
  updated: string;
  readMore: string;
  readLess: string;
  types: Record<string, string>;
}

interface WhatChangedBannerProps {
  changeSummary?: string;
  changeSummaryDate?: string;
  changeType?: string;
  labels: WhatChangedBannerLabels;
  /** Test seam; production callers omit it. */
  now?: Date;
}

export function WhatChangedBanner({
  changeSummary,
  changeSummaryDate,
  changeType,
  labels,
  now,
}: WhatChangedBannerProps) {
  const summary = changeSummary?.trim();
  if (!summary || !changeSummaryDate) return null;
  if (daysSince(changeSummaryDate, now) > WHATCHANGED_MAX_AGE_DAYS) return null;

  const pill = (changeType && labels.types[changeType]) || labels.updated;

  // ≈ 2 lines at 375px. Below this, the summary fits in 2 lines: render a plain
  // <p> (no clamp, no affordance) so short summaries get no dead "read more".
  // Above it, the clamp may hide content, so wrap in <details> with the hint.
  // Threshold errs LOW on purpose: never clamp text without giving a way to expand.
  const EXPAND_THRESHOLD = 70;
  const expandable = summary.length > EXPAND_THRESHOLD;

  return (
    <aside className="mb-4 rounded-lg border-l-4 border-status-delayed bg-status-delayed/10 p-3">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-status-delayed">
        {pill}
      </p>
      {expandable ? (
        <details>
          <summary className="wc-summary text-sm leading-relaxed text-neutral-900">
            <span className="wc-clamp">{summary}</span>
            <span aria-hidden className="wc-more text-xs font-semibold text-status-delayed">
              {labels.readMore} ▸
            </span>
            <span aria-hidden className="wc-less text-xs font-semibold text-status-delayed">
              {labels.readLess} ▾
            </span>
          </summary>
        </details>
      ) : (
        <p className="text-sm leading-relaxed text-neutral-900">{summary}</p>
      )}
    </aside>
  );
}
