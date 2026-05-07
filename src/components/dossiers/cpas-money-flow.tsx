// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

type Locale = 'fr' | 'nl' | 'en' | 'de';

export type CpasMoneyFlowStatus =
  | 'structural'
  | 'ongoing'
  | 'announced'
  | 'litigation'
  | 'removed'
  | 'pending';

export type CpasMoneyFlowRow = {
  source: string;
  channel: string;
  amount: string;
  status: CpasMoneyFlowStatus;
  note?: string;
};

type Labels = {
  caption: string;
  cols: { source: string; channel: string; amount: string; status: string };
  status: Record<CpasMoneyFlowStatus, string>;
};

const LABELS: Record<Locale, Labels> = {
  fr: {
    caption: 'Flux financiers des CPAS bruxellois — sources, canaux, statuts',
    cols: { source: 'Source', channel: 'Canal', amount: 'Montant', status: 'Statut' },
    status: {
      structural: 'structurel',
      ongoing: 'en cours',
      announced: 'annoncé',
      litigation: 'litige actif',
      removed: 'supprimé',
      pending: 'en attente',
    },
  },
  nl: {
    caption: 'Financiële stromen van de Brusselse OCMW’s — bronnen, kanalen, statussen',
    cols: { source: 'Bron', channel: 'Kanaal', amount: 'Bedrag', status: 'Status' },
    status: {
      structural: 'structureel',
      ongoing: 'lopend',
      announced: 'aangekondigd',
      litigation: 'actieve geschil',
      removed: 'afgeschaft',
      pending: 'in afwachting',
    },
  },
  en: {
    caption: 'Brussels CPAS funding flows — sources, channels, statuses',
    cols: { source: 'Source', channel: 'Channel', amount: 'Amount', status: 'Status' },
    status: {
      structural: 'structural',
      ongoing: 'ongoing',
      announced: 'announced',
      litigation: 'active dispute',
      removed: 'removed',
      pending: 'pending',
    },
  },
  de: {
    caption: 'Finanzströme der Brüsseler ÖSHZ — Quellen, Kanäle, Status',
    cols: { source: 'Quelle', channel: 'Kanal', amount: 'Betrag', status: 'Status' },
    status: {
      structural: 'strukturell',
      ongoing: 'laufend',
      announced: 'angekündigt',
      litigation: 'aktiver Rechtsstreit',
      removed: 'aufgehoben',
      pending: 'ausstehend',
    },
  },
};

const STATUS_TONE: Record<CpasMoneyFlowStatus, string> = {
  structural: 'border-neutral-300 bg-neutral-50 text-neutral-700',
  ongoing: 'border-brand-600/40 bg-brand-600/10 text-brand-700',
  announced: 'border-brand-600/40 bg-brand-600/10 text-brand-700',
  litigation: 'border-amber-300 bg-amber-50 text-amber-800',
  removed: 'border-neutral-400 bg-neutral-100 text-neutral-700',
  pending: 'border-amber-300 bg-amber-50 text-amber-800',
};

export function CpasMoneyFlow({
  rows,
  locale = 'fr',
}: {
  rows: CpasMoneyFlowRow[];
  locale?: Locale;
}) {
  const labels = LABELS[locale] ?? LABELS.fr;
  const captionId = `cpas-money-flow-caption-${locale}`;

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

      {/* Mobile: stacked cards */}
      <ul className="divide-y divide-neutral-200 sm:hidden">
        {rows.map((row, i) => (
          <li key={i} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-sm font-semibold text-neutral-900">{row.source}</div>
              <span
                className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[row.status]}`}
              >
                {labels.status[row.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">{row.channel}</p>
            <p className="mt-2 text-sm font-medium text-neutral-700">{row.amount}</p>
            {row.note && <p className="mt-1 text-xs text-neutral-500">{row.note}</p>}
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th scope="col" className="px-4 py-2.5">{labels.cols.source}</th>
              <th scope="col" className="px-4 py-2.5">{labels.cols.channel}</th>
              <th scope="col" className="px-4 py-2.5">{labels.cols.amount}</th>
              <th scope="col" className="px-4 py-2.5">{labels.cols.status}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-neutral-100 align-top">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-neutral-900">{row.source}</div>
                  {row.note && <div className="mt-1 text-xs text-neutral-500">{row.note}</div>}
                </td>
                <td className="px-4 py-2.5 text-neutral-600">{row.channel}</td>
                <td className="px-4 py-2.5 text-neutral-700">{row.amount}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[row.status]}`}
                  >
                    {labels.status[row.status]}
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
