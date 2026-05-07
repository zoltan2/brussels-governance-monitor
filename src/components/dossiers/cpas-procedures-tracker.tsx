// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { formatDate } from '@/lib/utils';

type Locale = 'fr' | 'nl' | 'en' | 'de';
type Severity = 'info' | 'warning' | 'critical';

export type CpasProcedure = {
  label: string;
  date: string;
  severity: Severity;
  lastEvent?: string;
};

type Labels = {
  caption: string;
  cols: { procedure: string; lastEvent: string; status: string };
  severity: Record<Severity, string>;
};

const LABELS: Record<Locale, Labels> = {
  fr: {
    caption: 'Procédures actives suivies par BGM',
    cols: { procedure: 'Procédure', lastEvent: 'Dernier événement', status: 'Statut' },
    severity: { info: 'à suivre', warning: 'en cours', critical: 'litige actif' },
  },
  nl: {
    caption: 'Actieve procedures opgevolgd door BGM',
    cols: { procedure: 'Procedure', lastEvent: 'Laatste gebeurtenis', status: 'Status' },
    severity: { info: 'op te volgen', warning: 'lopend', critical: 'actieve geschil' },
  },
  en: {
    caption: 'Active procedures tracked by BGM',
    cols: { procedure: 'Procedure', lastEvent: 'Latest event', status: 'Status' },
    severity: { info: 'to monitor', warning: 'ongoing', critical: 'active dispute' },
  },
  de: {
    caption: 'Von BGM verfolgte aktive Verfahren',
    cols: { procedure: 'Verfahren', lastEvent: 'Letztes Ereignis', status: 'Status' },
    severity: { info: 'zu verfolgen', warning: 'laufend', critical: 'aktiver Rechtsstreit' },
  },
};

const SEVERITY_TONE: Record<Severity, string> = {
  info: 'border-brand-600/40 bg-brand-600/10 text-brand-700',
  warning: 'border-amber-300 bg-amber-50 text-amber-800',
  critical: 'border-amber-400 bg-amber-100 text-amber-900',
};

export function CpasProceduresTracker({
  procedures,
  locale = 'fr',
}: {
  procedures: CpasProcedure[];
  locale?: Locale;
}) {
  const labels = LABELS[locale] ?? LABELS.fr;
  const captionId = `cpas-procedures-caption-${locale}`;

  return (
    <figure
      aria-labelledby={captionId}
      className="my-8 rounded-lg border border-neutral-200 bg-white"
    >
      <figcaption
        id={captionId}
        className="border-b border-neutral-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
      >
        {labels.caption}
      </figcaption>

      <ul className="divide-y divide-neutral-200 sm:hidden">
        {procedures.map((p, i) => (
          <li key={i} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 text-sm font-semibold text-neutral-900">{p.label}</span>
              <span
                className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${SEVERITY_TONE[p.severity]}`}
              >
                {labels.severity[p.severity]}
              </span>
            </div>
            {p.lastEvent && <p className="mt-1 text-xs text-neutral-600">{p.lastEvent}</p>}
            <p className="mt-1 text-xs text-neutral-500">{formatDate(p.date, locale)}</p>
          </li>
        ))}
      </ul>

      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th scope="col" className="px-4 py-2.5">{labels.cols.procedure}</th>
              <th scope="col" className="px-4 py-2.5">{labels.cols.lastEvent}</th>
              <th scope="col" className="px-4 py-2.5">{labels.cols.status}</th>
            </tr>
          </thead>
          <tbody>
            {procedures.map((p, i) => (
              <tr key={i} className="border-t border-neutral-100 align-top">
                <td className="px-4 py-2.5 font-medium text-neutral-900">{p.label}</td>
                <td className="px-4 py-2.5 text-neutral-700">
                  {p.lastEvent && <div>{p.lastEvent}</div>}
                  <div className="mt-0.5 text-xs text-neutral-500">{formatDate(p.date, locale)}</div>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${SEVERITY_TONE[p.severity]}`}
                  >
                    {labels.severity[p.severity]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
