'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface StatusAccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function StatusAccordion({ title, children, defaultOpen = false }: StatusAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-neutral-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        aria-expanded={open}
        aria-controls={`accordion-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        {title}
        <svg
          className={cn('h-4 w-4 shrink-0 text-neutral-500 transition-transform', open && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div id={`accordion-${title.replace(/\s+/g, '-').toLowerCase()}`} role="region" aria-label={title} className="border-t border-neutral-200 px-4 py-3 text-xs leading-relaxed text-neutral-600">
          {children}
        </div>
      )}
    </div>
  );
}
