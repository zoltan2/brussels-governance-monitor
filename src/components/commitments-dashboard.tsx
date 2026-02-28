// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface Commitment {
  id: string;
  domain: string;
  target: Record<string, string>;
  indicator: Record<string, string>;
  description: Record<string, string>;
  baseline: Record<string, string>;
  deadline: string;
  status: 'pending' | 'on-track' | 'delayed' | 'achieved';
  chapter: number;
}

export interface CommitmentsData {
  lastModified: string;
  source: string;
  sourceUrl: string;
  commitments: Commitment[];
}

const statusStyles: Record<string, string> = {
  pending: 'bg-neutral-100 text-neutral-600',
  'on-track': 'bg-status-ongoing/10 text-status-ongoing',
  delayed: 'bg-status-delayed/10 text-status-delayed',
  achieved: 'bg-status-resolved/10 text-status-resolved',
};

const domainStyles: Record<string, string> = {
  budget: 'border-l-amber-500',
  mobility: 'border-l-blue-500',
  housing: 'border-l-orange-500',
  employment: 'border-l-violet-500',
  climate: 'border-l-emerald-500',
  social: 'border-l-rose-500',
  security: 'border-l-slate-600',
  economy: 'border-l-cyan-500',
  cleanliness: 'border-l-lime-500',
  institutional: 'border-l-indigo-500',
  'urban-planning': 'border-l-stone-500',
  digital: 'border-l-sky-500',
  education: 'border-l-fuchsia-500',
};

type DomainSlug =
  | 'budget'
  | 'mobility'
  | 'housing'
  | 'employment'
  | 'climate'
  | 'social'
  | 'security'
  | 'economy'
  | 'cleanliness'
  | 'institutional'
  | 'urban-planning'
  | 'digital'
  | 'education';

export function CommitmentsDashboard({
  data,
  locale,
}: {
  data: CommitmentsData;
  locale: string;
}) {
  const t = useTranslations('dashboard');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const byDeadline = data.commitments.reduce(
    (acc, c) => {
      const year = c.deadline;
      if (!acc[year]) acc[year] = [];
      acc[year].push(c);
      return acc;
    },
    {} as Record<string, Commitment[]>,
  );

  const sortedYears = Object.keys(byDeadline).sort();

  return (
    <div>
      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
          <span>
            {t('total', { count: data.commitments.length })}
          </span>
          <span>
            {t('source')}:{' '}
            <a
              href={data.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 underline underline-offset-2"
            >
              {data.source}
            </a>
          </span>
        </div>
      </div>

      {sortedYears.map((year) => (
        <div key={year} className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <span className="rounded bg-brand-800 px-2 py-0.5 text-xs font-bold text-white">
              {year}
            </span>
            <span className="text-xs font-normal text-neutral-500">
              {byDeadline[year].length} {t('commitments')}
            </span>
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {byDeadline[year].map((commitment) => {
              const isExpanded = expanded.has(commitment.id);
              const desc = commitment.description?.[locale] || commitment.description?.fr;
              const base = commitment.baseline?.[locale] || commitment.baseline?.fr;

              return (
                <div
                  key={commitment.id}
                  className={`rounded-lg border border-neutral-200 border-l-4 bg-white transition-shadow ${isExpanded ? 'shadow-sm' : ''} ${domainStyles[commitment.domain] || 'border-l-neutral-300'}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(commitment.id)}
                    className="w-full cursor-pointer p-4 text-left"
                    aria-expanded={isExpanded}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-neutral-900">
                        {commitment.target[locale] || commitment.target.fr}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles[commitment.status]}`}
                      >
                        {t(`status.${commitment.status}`)}
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <p className="text-lg font-bold text-brand-900">
                        {commitment.indicator[locale] || commitment.indicator.fr}
                      </p>
                      <svg
                        className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <p className="mt-1 text-[10px] text-neutral-500">
                      {t('dprChapter', { chapter: commitment.chapter })}
                    </p>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-neutral-100 px-4 pb-4 pt-3">
                      {desc && (
                        <p className="text-xs leading-relaxed text-neutral-600">
                          {desc}
                        </p>
                      )}
                      {base && (
                        <p className="mt-2 text-xs text-neutral-500">
                          <span className="font-medium text-neutral-500">{t('baseline')}</span>{' '}
                          {base}
                        </p>
                      )}
                      <Link
                        href={{ pathname: '/domains/[slug]' as const, params: { slug: commitment.domain as DomainSlug } }}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                      >
                        {t('learnMore')}
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
