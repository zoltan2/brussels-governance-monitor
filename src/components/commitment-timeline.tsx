// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { formatDate } from '@/lib/utils';

interface StatusEntry {
  date: string;
  status: string;
  source: string;
}

const STATUS_DOT_COLORS: Record<string, string> = {
  'not-started': 'bg-neutral-400',
  announced: 'bg-brand-600',
  'in-legislation': 'bg-indigo-600',
  implemented: 'bg-teal-600',
  delayed: 'bg-amber-600',
  abandoned: 'bg-slate-500',
};

export function CommitmentTimeline({
  statusHistory,
  locale,
  statusLabels,
}: {
  statusHistory: StatusEntry[];
  locale: string;
  statusLabels: Record<string, string>;
}) {
  if (statusHistory.length === 0) return null;

  return (
    <div className="relative mt-3 space-y-0">
      <div className="absolute top-2 bottom-2 left-[5px] w-px bg-neutral-200" />
      {statusHistory.map((entry, i) => (
        <div key={`${entry.date}-${i}`} className="relative flex gap-3 pb-3 last:pb-0">
          <div className="relative z-10 mt-1.5 flex shrink-0">
            <div
              className={`h-[11px] w-[11px] rounded-full border-2 border-white ${
                STATUS_DOT_COLORS[entry.status] || 'bg-neutral-400'
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
              <span className="text-[11px] font-medium text-neutral-500">
                {formatDate(entry.date, locale)}
              </span>
              <span className="text-[10px] font-medium text-neutral-500">
                {statusLabels[entry.status] || entry.status}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-600">{entry.source}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
