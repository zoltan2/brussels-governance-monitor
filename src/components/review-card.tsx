// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useState } from 'react';

interface ReviewCardProps {
  title: string;
  slug: string;
  type: 'domain' | 'solution' | 'sector' | 'comparison';
  locale: string;
  lastModified: string;
  permalink: string;
  labels: {
    publish: string;
    reject: string;
    published: string;
    rejected: string;
    preview: string;
    rejectReasons: Record<string, string>;
    confirmPublish: string;
    confirmReject: string;
    cancel: string;
    error: string;
  };
}

type CardState = 'pending' | 'publishing' | 'published' | 'rejecting' | 'rejected' | 'error';

export function ReviewCard({
  title,
  slug,
  type,
  locale,
  lastModified,
  permalink,
  labels,
}: ReviewCardProps) {
  const [state, setState] = useState<CardState>('pending');
  const [showRejectMenu, setShowRejectMenu] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePublish = async () => {
    setState('publishing');
    try {
      const res = await fetch('/api/review/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, type, locale }),
      });

      if (res.status === 401) {
        setErrorMsg('Session expired');
        setState('error');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || 'Unknown error');
        setState('error');
        return;
      }

      setState('published');
    } catch {
      setErrorMsg('Network error');
      setState('error');
    }
  };

  const handleReject = async (reason: string) => {
    setState('rejecting');
    setShowRejectMenu(false);
    try {
      const res = await fetch('/api/review/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, type, locale, reason }),
      });

      if (res.status === 401) {
        setErrorMsg('Session expired');
        setState('error');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || 'Unknown error');
        setState('error');
        return;
      }

      setState('rejected');
    } catch {
      setErrorMsg('Network error');
      setState('error');
    }
  };

  const typeBadgeColors: Record<string, string> = {
    domain: 'bg-blue-100 text-blue-800',
    solution: 'bg-amber-100 text-amber-800',
    sector: 'bg-teal-100 text-teal-800',
    comparison: 'bg-purple-100 text-purple-800',
  };

  if (state === 'published') {
    return (
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
        <p className="text-sm font-medium text-teal-800">{labels.published}: {title}</p>
      </div>
    );
  }

  if (state === 'rejected') {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 opacity-60">
        <p className="text-sm font-medium text-neutral-500 line-through">{labels.rejected}: {title}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeColors[type]}`}>
              {type}
            </span>
            <span className="text-xs text-neutral-500">{locale.toUpperCase()}</span>
            <span className="text-xs text-neutral-500">{lastModified}</span>
          </div>
          <p className="text-sm font-semibold text-neutral-900">{title}</p>
        </div>

        <a
          href={permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
        >
          {labels.preview}
        </a>
      </div>

      {state === 'error' && (
        <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {labels.error}: {errorMsg}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={handlePublish}
          disabled={state === 'publishing' || state === 'rejecting'}
          className="rounded-md bg-brand-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-900 disabled:opacity-50"
        >
          {state === 'publishing' ? '...' : labels.publish}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowRejectMenu(!showRejectMenu)}
            disabled={state === 'publishing' || state === 'rejecting'}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            {state === 'rejecting' ? '...' : labels.reject}
          </button>

          {showRejectMenu && (
            <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
              {Object.entries(labels.rejectReasons).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleReject(key)}
                  className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setShowRejectMenu(false)}
                className="block w-full border-t border-neutral-100 px-4 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-50"
              >
                {labels.cancel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
