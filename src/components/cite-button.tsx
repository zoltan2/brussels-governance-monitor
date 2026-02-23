'use client';

import { useState, useRef, useEffect, useCallback, useId } from 'react';

interface CiteButtonProps {
  url: string;
  title: string;
  date: string;
  locale: string;
  labels: {
    cite: string;
    standard: string;
    academic: string;
    copy: string;
    copied: string;
    exportBibtex: string;
    close: string;
  };
}

function formatCiteDate(isoDate: string, locale: string): string {
  try {
    return new Date(isoDate).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

function formatYear(isoDate: string): string {
  try {
    return String(new Date(isoDate).getFullYear());
  } catch {
    return isoDate;
  }
}

function formatApaDate(isoDate: string, locale: string): string {
  try {
    return new Date(isoDate).toLocaleDateString(locale, {
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

function generateBibtex(title: string, url: string, date: string): string {
  const year = formatYear(date);
  const key = `bgm${year}${title.slice(0, 20).replace(/[^a-zA-Z]/g, '').toLowerCase()}`;
  const today = new Date().toISOString().split('T')[0];
  return `@misc{${key},
  author = {{Brussels Governance Monitor}},
  title = {${title}},
  year = {${year}},
  url = {${url}},
  note = {Accessed: ${today}}
}`;
}

export function CiteButton({ url, title, date, locale, labels }: CiteButtonProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'standard' | 'academic'>('standard');
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();
  const tabStandardId = useId();
  const tabAcademicId = useId();
  const panelStandardId = useId();
  const panelAcademicId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setCopied(false);
    buttonRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, close]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, close]);

  const formattedDate = formatCiteDate(date, locale);
  const year = formatYear(date);
  const apaDate = formatApaDate(date, locale);
  const today = formatCiteDate(new Date().toISOString(), locale);

  const standardCitation = `Brussels Governance Monitor, « ${title} ». Mis à jour le ${formattedDate}. ${url}`;
  const apaCitation = `Brussels Governance Monitor. (${year}, ${apaDate}). ${title}. Récupéré le ${today}, de ${url}`;

  const currentCitation = tab === 'standard' ? standardCitation : apaCitation;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(currentCitation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard not available
    }
  }

  function handleExportBibtex() {
    const bibtex = generateBibtex(title, url, date);
    const blob = new Blob([bibtex], { type: 'application/x-bibtex' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `bgm-${title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.bib`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  }

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={dialogId}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        {labels.cite}
      </button>

      {open && (
        <div
          ref={dialogRef}
          id={dialogId}
          role="dialog"
          aria-label={labels.cite}
          className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg sm:w-96"
        >
          {/* Tabs */}
          <div role="tablist" className="mb-3 flex gap-1 rounded-md bg-neutral-100 p-0.5">
            <button
              type="button"
              role="tab"
              id={tabStandardId}
              aria-selected={tab === 'standard'}
              aria-controls={panelStandardId}
              onClick={() => { setTab('standard'); setCopied(false); }}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === 'standard'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {labels.standard}
            </button>
            <button
              type="button"
              role="tab"
              id={tabAcademicId}
              aria-selected={tab === 'academic'}
              aria-controls={panelAcademicId}
              onClick={() => { setTab('academic'); setCopied(false); }}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === 'academic'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {labels.academic}
            </button>
          </div>

          {/* Panel */}
          <div
            role="tabpanel"
            id={tab === 'standard' ? panelStandardId : panelAcademicId}
            aria-labelledby={tab === 'standard' ? tabStandardId : tabAcademicId}
          >
            <div className="mb-3 rounded-md bg-neutral-50 p-3">
              <p className="break-all text-xs leading-relaxed text-neutral-700">
                {currentCitation}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-brand-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-800"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span aria-live="polite">{copied ? labels.copied : labels.copy}</span>
            </button>
            <button
              type="button"
              onClick={handleExportBibtex}
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              {labels.exportBibtex}
            </button>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={close}
            className="absolute right-2 top-2 rounded p-1 text-neutral-400 hover:text-neutral-600"
            aria-label={labels.close}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
