// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { InstrumentedMetric, Tab } from './types';
import { ProofDrawer } from './proof-drawer';

interface ProofDrawerTriggerProps {
  metric: InstrumentedMetric;
  children: ReactNode;
}

/**
 * Inline span trigger + collocated drawer for a single instrumented metric.
 *
 * Listens for a custom `proof:open` event dispatched by MetricsProvider when
 * a deep-link hash matches this trigger's id. The detail.tab opens the drawer
 * on the requested tab.
 */
export function ProofDrawerTrigger({ metric, children }: ProofDrawerTriggerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('narrative');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerId = useId();

  useEffect(() => {
    const node = triggerRef.current;
    if (!node) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: Tab }>).detail;
      const requestedTab = detail?.tab;
      if (requestedTab === 'narrative' || requestedTab === 'data' || requestedTab === 'histoire') {
        setTab(requestedTab);
      }
      setOpen(true);
    };
    node.addEventListener('proof:open', handler);
    return () => node.removeEventListener('proof:open', handler);
  }, []);

  const handleClick = () => {
    setOpen((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        if (next) {
          window.history.replaceState(null, '', `#proof-${metric.id}:${tab}`);
        } else {
          window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search,
          );
        }
      }
      return next;
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-proof={metric.id}
        aria-expanded={open}
        aria-controls={drawerId}
        onClick={handleClick}
        className="inline border-b border-dotted border-brand-700 bg-transparent text-brand-800 underline-offset-2 transition-colors hover:bg-brand-50 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
      >
        {children}
      </button>
      <ProofDrawer id={drawerId} metric={metric} open={open} tab={tab} onTabChange={setTab} />
    </>
  );
}
