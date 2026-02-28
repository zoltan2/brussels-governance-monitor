// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';

export function FalcSummary({ summary }: { summary: string }) {
  const t = useTranslations('accessibility');

  return (
    <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <svg
          className="h-5 w-5 text-brand-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
          {t('falcLabel')}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-neutral-700">{summary}</p>
    </div>
  );
}
