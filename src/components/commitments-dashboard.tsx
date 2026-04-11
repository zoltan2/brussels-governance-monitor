// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { CommitmentSparkline } from '@/components/commitment-sparkline';
import { CommitmentTimeline } from '@/components/commitment-timeline';

interface StatusEntry {
  date: string;
  status: string;
  source: string;
}

interface DataPoint {
  date: string;
  value: number;
  unit: string;
  source: string;
}

interface Minister {
  name: string;
  portfolio: Record<string, string>;
}

interface Commitment {
  id: string;
  domain: string;
  target: Record<string, string>;
  indicator: Record<string, string>;
  description: Record<string, string>;
  baseline: Record<string, string>;
  deadline: string;
  chapter: number;
  minister: Minister;
  statusHistory: StatusEntry[];
  dataPoints?: DataPoint[];
}

export interface CommitmentsData {
  lastModified: string;
  source: string;
  sourceUrl: string;
  commitments: Commitment[];
}

type CommitmentStatus = 'not-started' | 'announced' | 'in-legislation' | 'implemented' | 'delayed' | 'abandoned';

function getCurrentStatus(statusHistory: StatusEntry[]): CommitmentStatus {
  if (statusHistory.length === 0) return 'not-started';
  return statusHistory[statusHistory.length - 1].status as CommitmentStatus;
}

const statusStyles: Record<string, string> = {
  'not-started': 'bg-neutral-100 text-neutral-600',
  announced: 'bg-brand-700/20 text-brand-700',
  'in-legislation': 'bg-indigo-100 text-indigo-700',
  implemented: 'bg-status-resolved/10 text-status-resolved',
  delayed: 'bg-status-delayed/10 text-status-delayed',
  abandoned: 'bg-slate-200 text-slate-500',
};

const domainStyles: Record<string, string> = {
  budget: 'border-l-amber-500',
  mobility: 'border-l-brand-600',
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

  const statusLabels: Record<string, string> = {
    'not-started': t('status.not-started'),
    announced: t('status.announced'),
    'in-legislation': t('status.in-legislation'),
    implemented: t('status.implemented'),
    delayed: t('status.delayed'),
    abandoned: t('status.abandoned'),
  };

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
      <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
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
            <span className="rounded bg-brand-800 px-2 py-0.5 text-xs font-bold text-neutral-50">
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
              const currentStatus = getCurrentStatus(commitment.statusHistory);
              const portfolio = commitment.minister.portfolio[locale] || commitment.minister.portfolio.fr;

              return (
                <div
                  key={commitment.id}
                  className={`rounded-lg border border-neutral-200 border-l-4 bg-neutral-50 transition-shadow ${isExpanded ? 'shadow-sm' : ''} ${domainStyles[commitment.domain] || 'border-l-neutral-300'}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(commitment.id)}
                    className="w-full cursor-pointer p-4 text-left"
                    aria-expanded={isExpanded}
                    aria-controls={`commitment-detail-${commitment.id}`}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900">
                          {commitment.target[locale] || commitment.target.fr}
                        </p>
                        <p className="mt-0.5 text-[10px] text-neutral-500">
                          {portfolio}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles[currentStatus]}`}
                      >
                        {statusLabels[currentStatus]}
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <p className="text-lg font-bold text-brand-900">
                        {commitment.indicator[locale] || commitment.indicator.fr}
                      </p>
                      <div className="flex items-center gap-2">
                        {commitment.dataPoints && commitment.dataPoints.length >= 2 && (
                          <CommitmentSparkline dataPoints={commitment.dataPoints} />
                        )}
                        <svg
                          className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-neutral-500">
                      {t('dprChapter', { chapter: commitment.chapter })}
                    </p>
                  </button>

                  {isExpanded && (
                    <div id={`commitment-detail-${commitment.id}`} role="region" aria-label={commitment.target[locale] || commitment.target.fr} className="border-t border-neutral-100 px-4 pb-4 pt-3">
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

                      <CommitmentTimeline
                        statusHistory={commitment.statusHistory}
                        locale={locale}
                        statusLabels={statusLabels}
                      />

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
