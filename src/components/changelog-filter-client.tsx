// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { isFilterableSection } from '@/lib/filterable-sections';

interface FilterState {
  title: string;
  matchCount: number;
}

export function ChangelogFilterClient() {
  const searchParams = useSearchParams();
  const t = useTranslations('changelog');
  const [filter, setFilter] = useState<FilterState | null>(null);

  // Reads the URL and the already-rendered static table (an external DOM system)
  // to decide which rows to hide and what filter banner to show. The
  // set-state-in-effect lint rule generally discourages setState-in-effect, but
  // this IS the correct shape for one-time syncing from an external system
  // (the DOM rows rendered server-side) on mount/param change — same rationale
  // as density-context.tsx's localStorage sync.
  useEffect(() => {
    const slug = searchParams.get('slug');
    const section = searchParams.get('section');
    const rows = document.querySelectorAll<HTMLTableRowElement>('[data-changelog-row]');

    if (!isFilterableSection(section) || !slug) {
      rows.forEach((row) => {
        row.hidden = false;
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilter(null);
      return;
    }

    let matchCount = 0;
    let resolvedTitle = '';
    rows.forEach((row) => {
      const matches = row.dataset.targetSlug === slug && row.dataset.section === section;
      row.hidden = !matches;
      if (matches) {
        matchCount += 1;
        if (!resolvedTitle && row.dataset.title) resolvedTitle = row.dataset.title;
      }
    });

    setFilter({ title: resolvedTitle || t('genericCard'), matchCount });
  }, [searchParams, t]);

  if (!filter) return null;

  // Belt-and-braces reset: this page is fully static (no `searchParams` read
  // server-side), and navigating from a filtered URL to the same static
  // route with the query string removed doesn't reliably re-run the effect
  // above (the router has nothing new to render, so `useSearchParams()`
  // subscribers aren't guaranteed to re-fire). Clearing the filter directly
  // on click makes "view all" correct regardless of that router behavior.
  const clearFilter = () => {
    document.querySelectorAll<HTMLTableRowElement>('[data-changelog-row]').forEach((row) => {
      row.hidden = false;
    });
    setFilter(null);
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
      <span>{t('filteredFor', { title: filter.title })}</span>
      <Link href="/changelog" onClick={clearFilter} className="font-medium text-brand-700 hover:underline">
        {t('viewAll')}
      </Link>
      {filter.matchCount === 0 && (
        <p className="w-full text-neutral-500">{t('noEntriesForCard')}</p>
      )}
    </div>
  );
}
