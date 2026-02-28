// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatDate } from '@/lib/utils';
import type { ChangelogEntry } from '@/lib/changelog';

const typeBadgeClasses: Record<ChangelogEntry['type'], string> = {
  added: 'bg-blue-100 text-blue-800',
  updated: 'bg-slate-100 text-slate-700',
  corrected: 'bg-amber-100 text-amber-800',
  removed: 'bg-neutral-200 text-neutral-600',
};

export function RecentChanges({
  entries,
  locale,
}: {
  entries: ChangelogEntry[];
  locale: string;
}) {
  const t = useTranslations('changelog');

  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">{t('title')}</h2>
      <ul className="space-y-2">
        {entries.map((entry, i) => (
          <li key={i} className="flex items-start gap-3 text-xs">
            <time
              dateTime={entry.date}
              className="shrink-0 pt-0.5 text-neutral-500"
            >
              {formatDate(entry.date, locale)}
            </time>
            <span className="flex-1 text-neutral-600">{entry.description}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${typeBadgeClasses[entry.type]}`}
            >
              {t(`types.${entry.type}`)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-neutral-100 pt-3">
        <Link
          href="/changelog"
          className="text-xs font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900"
        >
          {t('viewAll')} →
        </Link>
      </div>
    </div>
  );
}
