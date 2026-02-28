// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { Link } from '@/i18n/navigation';
import { formatDate } from '@/lib/utils';

interface LatestUpdateBarProps {
  date: string;
  description: string;
  summary?: string;
  section: string;
  targetSlug: string | null;
  locale: string;
}

export function LatestUpdateBar({ date, description, summary, section, targetSlug, locale }: LatestUpdateBarProps) {
  const linkHref = getLinkHref(section, targetSlug);

  const content = (
    <div className="mx-auto flex min-w-0 max-w-5xl items-center gap-2 px-4 py-2.5">
      <span className="text-teal-500" aria-hidden="true">&#9679;</span>
      <time dateTime={date} className="shrink-0 text-xs font-medium tabular-nums text-neutral-500">
        {formatDate(date, locale)}
      </time>
      <span className="shrink-0 text-xs text-neutral-300" aria-hidden="true">&mdash;</span>
      <span className="min-w-0 flex-1 truncate text-xs text-neutral-600">{summary || description}</span>
      {linkHref && (
        <span className="shrink-0 text-xs text-brand-700" aria-hidden="true">&rarr;</span>
      )}
    </div>
  );

  if (linkHref) {
    return (
      <div className="border-b border-neutral-200 bg-slate-50">
        <Link
          href={linkHref}
          className="block transition-colors hover:bg-slate-100 [&_span.text-brand-700]:hover:text-brand-900"
        >
          {content}
        </Link>
      </div>
    );
  }

  return (
    <div className="border-b border-neutral-200 bg-slate-50">
      {content}
    </div>
  );
}

function getLinkHref(section: string, slug: string | null) {
  if (!slug) return null;
  switch (section) {
    case 'domains':
      return { pathname: '/domains/[slug]' as const, params: { slug } };
    case 'dossiers':
      return { pathname: '/dossiers/[slug]' as const, params: { slug } };
    case 'sectors':
      return { pathname: '/sectors/[slug]' as const, params: { slug } };
    case 'communes':
      return { pathname: '/communes/[slug]' as const, params: { slug } };
    case 'comparisons':
      return { pathname: '/comparisons/[slug]' as const, params: { slug } };
    case 'solutions':
      return { pathname: '/solutions/[slug]' as const, params: { slug } };
    default:
      return null;
  }
}
