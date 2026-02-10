'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';

interface SearchResult {
  url: string;
  meta: { title?: string };
  excerpt: string;
}

interface PagefindResult {
  id: string;
  data: () => Promise<SearchResult>;
}

const stripDiacritics = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function Search() {
  const t = useTranslations('search');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pagefind, setPagefind] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !pagefind) {
      // Dynamically load pagefind (built after next build, served from /pagefind/)
      // @ts-expect-error -- pagefind is generated at build time, no TS declarations
      import(/* webpackIgnore: true */ '/pagefind/pagefind.js')
        .then((pf) => {
          pf.init();
          setPagefind(pf);
        })
        .catch(() => {
          // Pagefind not available (dev mode or not yet indexed)
        });
    }
  }, [open, pagefind]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const search = useCallback(
    async (term: string) => {
      if (!pagefind || !term.trim()) {
        setResults([]);
        return;
      }

      const normalized = stripDiacritics(term);
      const queries =
        normalized !== term
          ? [pagefind.search(term), pagefind.search(normalized)]
          : [pagefind.search(term)];

      const responses = await Promise.all(queries);
      const allResults: PagefindResult[] = responses.flatMap(
        (r: { results: PagefindResult[] }) => r.results,
      );

      // Deduplicate by ID, keep first (best score)
      const seen = new Set<string>();
      const unique = allResults.filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

      const data: SearchResult[] = await Promise.all(
        unique.slice(0, 8).map((r) => r.data()),
      );
      // Filter to current locale
      const filtered = data
        .filter((r: SearchResult) => r.url.includes(`/${locale}/`))
        .map((r: SearchResult) => ({ ...r, url: r.url.replace(/\.html$/, '') }));
      setResults(filtered);
    },
    [pagefind, locale],
  );

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Keyboard shortcut: Ctrl/Cmd+K
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-500 transition-colors hover:bg-neutral-100"
        aria-label={t('placeholder')}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span className="hidden sm:inline">{t('placeholder')}</span>
        <kbd className="hidden rounded border border-neutral-300 px-1 font-mono text-[10px] sm:inline">
          {'\u2318'}K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]"
          role="dialog"
          aria-modal="true"
          aria-label={t('placeholder')}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl">
            <div className="flex items-center border-b border-neutral-200 px-4">
              <svg className="mr-2 h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <label htmlFor="search-input" className="sr-only">{t('placeholder')}</label>
              <input
                ref={inputRef}
                id="search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('placeholder')}
                className="flex-1 border-none py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-400"
              >
                ESC
              </button>
            </div>

            {query.trim() && results.length > 0 && (
              <ul className="max-h-80 overflow-y-auto p-2">
                {results.map((result, i) => (
                  <li key={i}>
                    <a
                      href={result.url}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-2 hover:bg-neutral-100"
                    >
                      <p className="text-sm font-medium text-neutral-900">
                        {result.meta.title || result.url}
                      </p>
                      <p
                        className="mt-0.5 text-xs text-neutral-500"
                        dangerouslySetInnerHTML={{ __html: result.excerpt }}
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {query.trim() && results.length === 0 && pagefind && (
              <div className="p-6 text-center text-sm text-neutral-500">
                {t('noResults')}
              </div>
            )}

            {!pagefind && query.trim() && (
              <div className="p-6 text-center text-sm text-neutral-400">
                {t('loading')}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
