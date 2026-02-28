// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/utils';

interface Source {
  url: string;
  label: string;
  accessedAt: string;
}

const labels: Record<string, { showAll: string; showLess: string; title: string; accessedAt: string; lastModified: string }> = {
  fr: { title: 'Sources', showAll: 'Voir les {n} autres sources', showLess: 'Reduire', accessedAt: 'consulte le {date}', lastModified: 'Derniere mise a jour : {date}' },
  nl: { title: 'Bronnen', showAll: 'Toon {n} andere bronnen', showLess: 'Inklappen', accessedAt: 'geraadpleegd op {date}', lastModified: 'Laatst bijgewerkt: {date}' },
  en: { title: 'Sources', showAll: 'Show {n} more sources', showLess: 'Show less', accessedAt: 'accessed {date}', lastModified: 'Last updated: {date}' },
  de: { title: 'Quellen', showAll: '{n} weitere Quellen anzeigen', showLess: 'Weniger anzeigen', accessedAt: 'abgerufen am {date}', lastModified: 'Letzte Aktualisierung: {date}' },
};

const VISIBLE_COUNT = 5;

export function CollapsibleSources({ sources, lastModified, locale }: { sources: Source[]; lastModified: string; locale: string }) {
  const [expanded, setExpanded] = useState(false);
  const l = labels[locale] ?? labels.fr;

  const visible = expanded ? sources : sources.slice(0, VISIBLE_COUNT);
  const hiddenCount = sources.length - VISIBLE_COUNT;

  return (
    <div className="mt-8 border-t border-neutral-200 pt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {l.title}
      </h2>
      <ul className="space-y-2">
        {visible.map((source) => (
          <li key={source.url} className="text-sm">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 underline underline-offset-2 hover:text-brand-900"
            >
              {source.label}
            </a>
            <time dateTime={source.accessedAt} className="ml-2 text-xs text-neutral-500">
              ({l.accessedAt.replace('{date}', formatDate(source.accessedAt, locale))})
            </time>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs font-medium text-brand-700 transition-colors hover:text-brand-900"
        >
          {expanded ? l.showLess : l.showAll.replace('{n}', String(hiddenCount))}
        </button>
      )}
      <p className="mt-4 text-xs text-neutral-500">
        <time dateTime={lastModified}>
          {l.lastModified.replace('{date}', formatDate(lastModified, locale))}
        </time>
      </p>
    </div>
  );
}
