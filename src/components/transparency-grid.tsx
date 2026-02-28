// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';

type IndicatorValue = 'yes' | 'partial' | 'no';

interface TransparencyGridProps {
  indicators: Record<string, IndicatorValue>;
  score: number;
  total: number;
}

const indicatorKeys = [
  'budgetOnline',
  'councilMinutesOnline',
  'councilLivestream',
  'openData',
  'participationPlatform',
  'mandateRegistry',
] as const;

function IndicatorIcon({ value }: { value: IndicatorValue }) {
  if (value === 'yes') {
    return (
      <svg className="h-5 w-5 text-status-resolved" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (value === 'partial') {
    return (
      <svg className="h-5 w-5 text-status-delayed" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function TransparencyGrid({ indicators, score, total }: TransparencyGridProps) {
  const t = useTranslations('communes');

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {t('transparencyGrid')}
        </h2>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-700">
          {t('criteriaOf', { score, total })}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {indicatorKeys.map((key) => {
          const value = indicators[key] as IndicatorValue;
          return (
            <div
              key={key}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3"
            >
              <IndicatorIcon value={value} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900">
                  {t(`indicators.${key}`)}
                </p>
                <p className="text-xs text-neutral-500">
                  {t(`indicatorValues.${value}`)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Compact version for card preview */
export function TransparencyScoreBadge({ score, total }: { score: number; total: number }) {
  const t = useTranslations('communes');
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
      <svg className="h-3.5 w-3.5 text-status-resolved" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
      </svg>
      {t('criteriaOf', { score, total })}
    </span>
  );
}
