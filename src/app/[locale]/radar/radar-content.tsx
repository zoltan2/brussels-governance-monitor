'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { formatDate } from '@/lib/utils';
import type { LocalizedRadarEntry } from '@/lib/radar';
import type { RadarLabels } from './page';

const PAGE_SIZE = 30;

const CONFIDENCE_STYLES: Record<string, string> = {
  official: 'bg-blue-50 text-blue-700 border-blue-200',
  estimated: 'bg-amber-50 text-amber-700 border-amber-200',
  unconfirmed: 'bg-neutral-100 text-neutral-500 border-neutral-200',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-teal-50 text-teal-700 border-teal-200',
  archived: 'bg-neutral-50 text-neutral-400 border-neutral-200',
};

export function RadarContent({
  active,
  confirmed,
  archived,
  locale,
  labels,
}: {
  active: LocalizedRadarEntry[];
  confirmed: LocalizedRadarEntry[];
  archived: LocalizedRadarEntry[];
  locale: string;
  labels: RadarLabels;
}) {
  const [page, setPage] = useState(1);
  const visibleActive = active.slice(0, page * PAGE_SIZE);
  const hasMore = active.length > page * PAGE_SIZE;

  return (
    <>
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-neutral-900">{labels.title}</h1>
        <p className="text-sm text-neutral-500">{labels.subtitle}</p>
      </div>

      {/* Shield callout */}
      <div className="mb-8 rounded-md border-l-4 border-blue-300 bg-blue-50/50 px-4 py-3">
        <p className="text-sm leading-relaxed text-neutral-600">
          {labels.shieldText}
        </p>
      </div>

      {/* Active signals */}
      {active.length > 0 ? (
        <div className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            {labels.homepageTitle}
          </h2>
          <div className="space-y-4">
            {visibleActive.map((signal) => (
              <SignalCard key={signal.id} signal={signal} locale={locale} labels={labels} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                {labels.loadMore}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="mb-10 text-sm text-neutral-500">{labels.noActiveSignals}</p>
      )}

      {/* Confirmed signals */}
      {confirmed.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            {labels.confirmedSection}
          </h2>
          <div className="space-y-4">
            {confirmed.map((signal) => (
              <SignalCard key={signal.id} signal={signal} locale={locale} labels={labels} />
            ))}
          </div>
        </div>
      )}

      {/* Archive */}
      {archived.length > 0 && (
        <details className="group">
          <summary className="mb-4 flex cursor-pointer list-none items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-400 [&::-webkit-details-marker]:hidden">
            <svg
              className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {labels.archiveSection} ({archived.length})
          </summary>
          <div className="space-y-4">
            {archived.map((signal) => (
              <SignalCard key={signal.id} signal={signal} locale={locale} labels={labels} />
            ))}
          </div>
        </details>
      )}
    </>
  );
}

// ---------- Signal card ----------

function SignalCard({
  signal,
  locale,
  labels,
}: {
  signal: LocalizedRadarEntry;
  locale: string;
  labels: RadarLabels;
}) {
  const isArchived = signal.status === 'archived';
  const promotedSection = signal.promotedSection ?? 'domains';

  return (
    <div
      className={`rounded-lg border p-4 ${
        isArchived
          ? 'border-neutral-100 bg-neutral-50'
          : 'border-neutral-200 bg-white'
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <time
          dateTime={signal.date}
          className="text-xs tabular-nums text-neutral-400"
        >
          {formatDate(signal.date, locale)}
        </time>
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${CONFIDENCE_STYLES[signal.confidence] ?? CONFIDENCE_STYLES.unconfirmed}`}
        >
          {labels.confidence[signal.confidence] ?? signal.confidence}
        </span>
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[signal.status] ?? STATUS_STYLES.active}`}
        >
          {labels.status[signal.status] ?? signal.status}
        </span>
      </div>

      <p className={`text-sm leading-relaxed ${isArchived ? 'text-neutral-400' : 'text-neutral-700'}`}>
        {signal.description}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="text-neutral-400">
          {labels.source} :{' '}
          {signal.source.url ? (
            <a
              href={signal.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 underline underline-offset-2 hover:text-brand-900"
            >
              {signal.source.label}
            </a>
          ) : (
            <span className="text-neutral-600">{signal.source.label}</span>
          )}
        </span>

        {signal.nextStep && (
          <span className="text-neutral-400">
            {labels.nextStep} : <span className="text-neutral-600">{signal.nextStep}</span>
          </span>
        )}

        {signal.promotedTo && promotedSection === 'dossiers' && (
          <Link
            href={{ pathname: '/dossiers/[slug]', params: { slug: signal.promotedTo } }}
            className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-900"
          >
            {labels.seeCard}
          </Link>
        )}
        {signal.promotedTo && promotedSection !== 'dossiers' && (
          <Link
            href={{ pathname: '/domains/[slug]', params: { slug: signal.promotedTo } }}
            className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-900"
          >
            {labels.seeCard}
          </Link>
        )}
      </div>
    </div>
  );
}
