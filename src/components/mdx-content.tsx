// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import * as runtime from 'react/jsx-runtime';
import { useMemo } from 'react';
import { CpasThreeAuthorities } from '@/components/dossiers/cpas-three-authorities';
import { CpasMoneyFlow } from '@/components/dossiers/cpas-money-flow';
import { CpasProceduresTracker } from '@/components/dossiers/cpas-procedures-tracker';
import { RechauffementChantiersTable } from '@/components/dossiers/rechauffement/chantiers-table';
import { RechauffementEauCounters } from '@/components/dossiers/rechauffement/eau-counters';
import { RechauffementHeatCounters } from '@/components/dossiers/rechauffement/heat-counters';
import { RechauffementResponsibilityMatrix } from '@/components/dossiers/rechauffement/responsibility-matrix';
import { Claim } from '@/components/mdx/claim';
import { MetricsProvider } from '@/components/proof-drawer/metrics-context';
import type { Metric } from '@/components/proof-drawer/types';
import { Signal, Essentiel, Complet } from '@/components/dossier/density/density-layer';
import { SignalLead } from '@/components/dossier/density/signal-lead';

interface MdxContentProps {
  code: string;
  metrics?: Metric[];
}

const sharedComponents = {
  CpasThreeAuthorities,
  CpasMoneyFlow,
  CpasProceduresTracker,
  RechauffementChantiersTable,
  RechauffementEauCounters,
  RechauffementHeatCounters,
  RechauffementResponsibilityMatrix,
  Claim,
  Signal,
  Essentiel,
  Complet,
  SignalLead,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mb-3 mt-10 border-b border-neutral-200 pb-2 text-lg font-bold text-neutral-900" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mb-2 mt-6 text-lg font-semibold text-neutral-800" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 text-sm leading-relaxed text-neutral-700" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-4 ml-4 list-disc space-y-1 text-sm text-neutral-700" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-4 ml-4 list-decimal space-y-1 text-sm text-neutral-700" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-neutral-900" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="text-brand-700 underline underline-offset-2 hover:text-brand-900"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-4 border-l-2 border-brand-600 pl-4 text-sm italic text-neutral-600"
      {...props}
    />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    // tabIndex={0} : une zone défilante doit être atteignable au clavier, sinon
    // un tableau large est illisible sans souris (axe scrollable-region-focusable,
    // constaté à 390 px sur toute page MDX portant un tableau). Pas de role="region"
    // ici : une région sans nom accessible créerait une violation de plus, et ce
    // composant n'a pas accès aux traductions.
    <div tabIndex={0} className="my-4 overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full text-sm" {...props} />
    </div>
  ),
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-neutral-100 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500" {...props} />
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-4 py-2.5" {...props} />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="border-t border-neutral-100 px-4 py-2.5 text-neutral-700" {...props} />
  ),
  tr: (props: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="even:bg-neutral-100/50" {...props} />
  ),
};

export function MdxContent({ code, metrics = [] }: MdxContentProps) {
  // IMPORTANT: depend on [code] only — `metrics` flows through MetricsProvider,
  // not into the compiled MDX module. Re-evaluating new Function(code) on every
  // metrics change would be expensive and unnecessary.
  const element = useMemo(() => {
    const fn = new Function(code);
    const Component = fn({ ...runtime }).default;
    return <Component components={sharedComponents} />;
  }, [code]);

  return <MetricsProvider metrics={metrics}>{element}</MetricsProvider>;
}
