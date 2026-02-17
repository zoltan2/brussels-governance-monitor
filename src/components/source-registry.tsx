'use client';

import { useState, useMemo } from 'react';

export interface RegistrySource {
  name: string;
  type: 'institutional' | 'press' | 'legal' | 'agency' | 'research' | 'think-tank';
  lang: string;
  category: string;
  enabled: boolean;
  tier: 'editorial' | 'radar';
  url?: string;
}

function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

type FilterKey = 'all' | 'pressFr' | 'pressNl' | 'institutional' | 'international';

interface FilterDef {
  key: FilterKey;
  test: (s: RegistrySource) => boolean;
}

const FILTERS: FilterDef[] = [
  { key: 'all', test: () => true },
  { key: 'pressFr', test: (s) => s.type === 'press' && s.lang === 'fr' },
  { key: 'pressNl', test: (s) => s.type === 'press' && s.lang === 'nl' },
  {
    key: 'institutional',
    test: (s) =>
      s.type === 'institutional' || s.type === 'legal' || s.type === 'agency',
  },
  {
    key: 'international',
    test: (s) =>
      !(['press'].includes(s.type) && ['fr', 'nl'].includes(s.lang)) &&
      !(['institutional', 'legal', 'agency'].includes(s.type)),
  },
];

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  institutional: { bg: 'bg-blue-50', text: 'text-blue-700' },
  press: { bg: 'bg-neutral-100', text: 'text-neutral-600' },
  legal: { bg: 'bg-blue-50', text: 'text-blue-700' },
  agency: { bg: 'bg-blue-50', text: 'text-blue-700' },
  research: { bg: 'bg-amber-50', text: 'text-amber-700' },
  'think-tank': { bg: 'bg-amber-50', text: 'text-amber-700' },
};

const INITIAL_VISIBLE = 20;

interface SuggestLabels {
  suggestTitle: string;
  suggestDescription: string;
  suggestUrlLabel: string;
  suggestUrlPlaceholder: string;
  suggestCommentLabel: string;
  suggestCommentPlaceholder: string;
  suggestSubmit: string;
  suggestSubmitting: string;
  suggestSuccess: string;
  suggestError: string;
}

interface SourceRegistryProps {
  sources: RegistrySource[];
  labels: {
    all: string;
    pressFr: string;
    pressNl: string;
    institutional: string;
    international: string;
    search: string;
    showAll: string;
    active: string;
    inactive: string;
    noResults: string;
    typeLabels: Record<string, string>;
  } & SuggestLabels;
}

export function SourceRegistry({ sources, labels }: SourceRegistryProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const filterCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = {
      all: sources.length,
      pressFr: 0,
      pressNl: 0,
      institutional: 0,
      international: 0,
    };
    for (const s of sources) {
      for (const f of FILTERS) {
        if (f.key !== 'all' && f.test(s)) counts[f.key]++;
      }
    }
    return counts;
  }, [sources]);

  const filtered = useMemo(() => {
    const filterFn = FILTERS.find((f) => f.key === activeFilter)?.test ?? (() => true);
    const q = query.toLowerCase().trim();
    return sources.filter((s) => {
      if (!filterFn(s)) return false;
      if (q && !s.name.toLowerCase().includes(q) && !(s.url?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [sources, activeFilter, query]);

  const visible = expanded ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const remaining = filtered.length - INITIAL_VISIBLE;

  return (
    <div>
      {/* Filter pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => { setActiveFilter(f.key); setExpanded(false); }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === f.key
                ? 'border-brand-700 bg-brand-700 text-white'
                : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {labels[f.key]} ({filterCounts[f.key]})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setExpanded(false); }}
          placeholder={labels.search}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* Source list */}
      <div className="space-y-1">
        {visible.map((s) => {
          const style = TYPE_STYLES[s.type] ?? TYPE_STYLES.press;
          const typeLabel = labels.typeLabels[s.type] ?? s.type;
          const hostname = s.url ? extractHostname(s.url) : null;
          return (
            <div
              key={s.name}
              className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${
                s.enabled
                  ? 'border-neutral-200 bg-white'
                  : 'border-neutral-100 bg-neutral-50'
              }`}
            >
              <div className="min-w-0 flex-1">
                <span className={`text-sm ${s.enabled ? 'text-neutral-900' : 'text-neutral-400'}`}>
                  {s.name}
                </span>
                {hostname && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-neutral-400 hover:text-neutral-600"
                  >
                    {hostname}
                  </a>
                )}
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
                >
                  {typeLabel}
                </span>
                {!s.enabled && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-400">
                    {labels.inactive}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show all button */}
      {!expanded && remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-4 w-full rounded-lg border border-neutral-200 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
        >
          {labels.showAll.replace('__count__', String(remaining))}
        </button>
      )}

      {/* Empty state + inline suggest */}
      {filtered.length === 0 && (
        <div className="py-8 text-center">
          <p className="mb-6 text-sm text-neutral-400">{labels.noResults}</p>
          <SuggestSourceForm labels={labels} />
        </div>
      )}

      {/* Permanent suggest at bottom */}
      {filtered.length > 0 && (
        <div className="mt-6">
          <SuggestSourceForm labels={labels} />
        </div>
      )}
    </div>
  );
}

// ---------- Suggest source form ----------

function SuggestSourceForm({ labels }: { labels: SuggestLabels }) {
  const [url, setUrl] = useState('');
  const [comment, setComment] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    if (website) return; // honeypot

    setStatus('submitting');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardTitle: url.trim(),
          cardType: 'source-registry',
          cardSlug: 'suggestion',
          feedbackType: 'suggest-source',
          message: comment.trim() || url.trim(),
          url: window.location.href,
        }),
      });

      if (res.ok) {
        setStatus('success');
        setTimeout(() => {
          setStatus('idle');
          setUrl('');
          setComment('');
        }, 4000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50/50 p-5">
      <h3 className="mb-1 text-sm font-semibold text-neutral-700">{labels.suggestTitle}</h3>
      <p className="mb-4 text-xs text-neutral-500">{labels.suggestDescription}</p>

      {status === 'success' ? (
        <p className="text-sm font-medium text-teal-700" role="status" aria-live="polite">
          {labels.suggestSuccess}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="suggest-source-url" className="mb-1 block text-xs font-medium text-neutral-600">
              {labels.suggestUrlLabel}
            </label>
            <input
              id="suggest-source-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={labels.suggestUrlPlaceholder}
              required
              maxLength={500}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400"
            />
          </div>

          <div>
            <label htmlFor="suggest-source-comment" className="mb-1 block text-xs font-medium text-neutral-600">
              {labels.suggestCommentLabel}
            </label>
            <textarea
              id="suggest-source-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={labels.suggestCommentPlaceholder}
              rows={2}
              maxLength={500}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
            />
          </div>

          {/* Honeypot */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {status === 'error' && (
            <p className="text-xs text-status-delayed" role="alert">{labels.suggestError}</p>
          )}

          <button
            type="submit"
            disabled={status === 'submitting' || !url.trim()}
            className="rounded-md bg-brand-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
          >
            {status === 'submitting' ? labels.suggestSubmitting : labels.suggestSubmit}
          </button>
        </form>
      )}
    </div>
  );
}
