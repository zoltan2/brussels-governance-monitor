'use client';

import { useState } from 'react';

interface CiteButtonProps {
  title: string;
  lastModified: string;
  label: string;
  copiedLabel: string;
}

export function CiteButton({ title, lastModified, label, copiedLabel }: CiteButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleCite() {
    const url = window.location.href;
    const date = new Date(lastModified).toLocaleDateString('fr-BE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const citation = `Brussels Governance Monitor. « ${title} ». Mis à jour le ${date}. ${url}. Licence CC BY-SA 4.0.`;

    navigator.clipboard.writeText(citation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // Clipboard not available
    });
  }

  return (
    <button
      type="button"
      onClick={handleCite}
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
      {copied ? copiedLabel : label}
    </button>
  );
}
