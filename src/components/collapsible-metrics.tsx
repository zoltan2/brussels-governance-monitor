'use client';

import { useState } from 'react';

interface Metric {
  label: string;
  value: string;
  unit?: string;
}

const labels: Record<string, { showAll: string; showLess: string; title: string }> = {
  fr: { title: 'Chiffres cles', showAll: 'Voir les {n} autres chiffres', showLess: 'Reduire' },
  nl: { title: 'Kerncijfers', showAll: 'Toon {n} andere cijfers', showLess: 'Inklappen' },
  en: { title: 'Key figures', showAll: 'Show {n} more figures', showLess: 'Show less' },
  de: { title: 'Schluesselzahlen', showAll: '{n} weitere Zahlen anzeigen', showLess: 'Weniger anzeigen' },
};

const VISIBLE_COUNT = 5;

export function CollapsibleMetrics({ metrics, locale }: { metrics: Metric[]; locale: string }) {
  const [expanded, setExpanded] = useState(false);
  const l = labels[locale] ?? labels.fr;

  if (metrics.length === 0) return null;

  const visible = expanded ? metrics : metrics.slice(0, VISIBLE_COUNT);
  const hiddenCount = metrics.length - VISIBLE_COUNT;

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {l.title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map((metric) => (
          <div key={metric.label} className="rounded-lg bg-neutral-50 p-4">
            <p className="text-2xl font-bold text-brand-900">
              {metric.value}
              {metric.unit && (
                <span className="ml-1 text-sm font-normal text-neutral-500">
                  {metric.unit}
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-neutral-500">{metric.label}</p>
          </div>
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs font-medium text-brand-700 transition-colors hover:text-brand-900"
        >
          {expanded ? l.showLess : l.showAll.replace('{n}', String(hiddenCount))}
        </button>
      )}
    </div>
  );
}
