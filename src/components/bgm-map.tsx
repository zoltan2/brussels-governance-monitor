// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { ComponentProps } from 'react';

type LinkHref = ComponentProps<typeof Link>['href'];
import type { GraphData, GraphNode } from '@/lib/graph';
import { computeLayout } from '@/lib/graph';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  data: GraphData;
  labels: {
    title: string;
    accessibleListTitle: string;
    connections: string;
    viewPage: string;
    close: string;
    status: Record<string, string>;
    type: Record<string, string>;
  };
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SVG_W = 800;
const SVG_H = 600;
const PADDING = 50;

const STATUS_COLORS: Record<string, string> = {
  ongoing: 'var(--color-status-ongoing)',
  blocked: 'var(--color-status-blocked)',
  delayed: 'var(--color-status-delayed)',
  resolved: 'var(--color-status-resolved)',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSvgX(nx: number): number {
  return PADDING + nx * (SVG_W - 2 * PADDING);
}

function toSvgY(ny: number): number {
  return PADDING + ny * (SVG_H - 2 * PADDING);
}

function getConnections(
  nodeId: string,
  edges: GraphData['edges'],
  nodes: GraphNode[],
): GraphNode[] {
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    if (edge.source === nodeId) connectedIds.add(edge.target);
    if (edge.target === nodeId) connectedIds.add(edge.source);
  }
  return nodes.filter((n) => connectedIds.has(n.id));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BGMMap({ data, labels }: Props) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const layout = computeLayout(data);

  // Scroll detail panel into view when a node is selected
  useEffect(() => {
    if (selectedNode && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedNode]);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      setSelectedNode((prev) => (prev?.id === node.id ? null : node));
    },
    [],
  );

  const handleNodeKeyDown = useCallback(
    (e: React.KeyboardEvent, node: GraphNode) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNodeClick(node);
      }
    },
    [handleNodeClick],
  );

  const statusColor = (status: string) =>
    STATUS_COLORS[status] ?? STATUS_COLORS.ongoing;

  return (
    <div className="flex flex-col gap-6">
      {/* ----------------------------------------------------------------- */}
      {/* SVG Graph                                                         */}
      {/* ----------------------------------------------------------------- */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full max-w-3xl"
        role="img"
        aria-label={labels.title}
      >
        {/* Background */}
        <rect
          x="0"
          y="0"
          width={SVG_W}
          height={SVG_H}
          className="fill-neutral-50 dark:fill-neutral-800"
          rx="8"
        />

        {/* Edges */}
        {data.edges.map((edge) => {
          const src = layout.get(edge.source);
          const tgt = layout.get(edge.target);
          if (!src || !tgt) return null;
          return (
            <line
              key={`${edge.source}-${edge.target}`}
              x1={toSvgX(src.x)}
              y1={toSvgY(src.y)}
              x2={toSvgX(tgt.x)}
              y2={toSvgY(tgt.y)}
              className="stroke-neutral-300 dark:stroke-neutral-600"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Nodes */}
        {data.nodes.map((node) => {
          const pos = layout.get(node.id);
          if (!pos) return null;
          const cx = toSvgX(pos.x);
          const cy = toSvgY(pos.y);
          const isDomain = node.type === 'domain';
          const r = isDomain ? 28 : 22;
          const isFocal = data.focusId === node.id;
          const isSelected = selectedNode?.id === node.id;
          const color = statusColor(node.status);
          const nodeLabel = `${labels.type[node.type] ?? node.type}: ${node.label} — ${labels.status[node.status] ?? node.status}`;

          return (
            <g
              key={node.id}
              tabIndex={0}
              role="button"
              aria-label={nodeLabel}
              onClick={() => handleNodeClick(node)}
              onKeyDown={(e) => handleNodeKeyDown(e, node)}
              className="cursor-pointer outline-none"
            >
              {/* Invisible 44x44 tap target (WCAG 2.5.8) */}
              <rect
                x={cx - 22}
                y={cy - 22}
                width={44}
                height={44}
                fill="transparent"
              />

              {/* Focus ring (WCAG 2.4.11) — visible when selected or focused */}
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 6}
                  fill="none"
                  stroke="var(--color-brand-700)"
                  strokeWidth="2.5"
                />
              )}

              {/* Status color ring */}
              <circle
                cx={cx}
                cy={cy}
                r={r + 3}
                fill="none"
                stroke={color}
                strokeWidth="2"
              />

              {/* Main circle */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={isFocal ? 'var(--color-brand-700)' : undefined}
                className={isFocal ? '' : 'fill-white dark:fill-neutral-900'}
                stroke={color}
                strokeWidth={isDomain ? '2' : '1.5'}
                strokeDasharray={isDomain ? undefined : '6 3'}
              />

              {/* Label below node */}
              <text
                x={cx}
                y={cy + r + 16}
                textAnchor="middle"
                className="fill-neutral-700 dark:fill-neutral-300"
                style={{ fontSize: '11px', fontWeight: 500 }}
              >
                {node.shortLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* ----------------------------------------------------------------- */}
      {/* Detail panel                                                      */}
      {/* ----------------------------------------------------------------- */}
      {selectedNode && (
        <div
          ref={detailRef}
          aria-live="polite"
          className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status badge */}
              <span
                className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{
                  borderWidth: '1.5px',
                  borderStyle: 'solid',
                  borderColor: statusColor(selectedNode.status),
                  color: statusColor(selectedNode.status),
                }}
              >
                {labels.status[selectedNode.status] ?? selectedNode.status}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {labels.type[selectedNode.type] ?? selectedNode.type}
              </span>
            </div>
            {/* Close button (min 36x36 target) */}
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              aria-label={labels.close}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <h3 className="mt-2 text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {selectedNode.label}
          </h3>

          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {selectedNode.summary}
          </p>

          {/* Metrics grid */}
          {selectedNode.metrics.length > 0 && (
            <dl className="mt-3 grid grid-cols-2 gap-3">
              {selectedNode.metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-md bg-neutral-50 px-3 py-2 dark:bg-neutral-800"
                >
                  <dt className="text-xs text-neutral-500 dark:text-neutral-400">
                    {m.label}
                  </dt>
                  <dd className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {m.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {/* Connections */}
          {(() => {
            const connections = getConnections(
              selectedNode.id,
              data.edges,
              data.nodes,
            );
            if (connections.length === 0) return null;
            return (
              <div className="mt-3">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  {labels.connections}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {connections.map((c) => (
                    <span
                      key={c.id}
                      className="inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    >
                      {c.shortLabel}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* View page link */}
          <div className="mt-4">
            <Link
              href={selectedNode.link as LinkHref}
              className="inline-flex items-center gap-1 text-sm font-medium"
              style={{ color: 'var(--color-brand-700)' }}
            >
              {labels.viewPage}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Accessible text list                                              */}
      {/* ----------------------------------------------------------------- */}
      <details className="rounded-lg border border-neutral-200 dark:border-neutral-700">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {labels.accessibleListTitle}
        </summary>
        <ul className="divide-y divide-neutral-100 px-4 pb-3 dark:divide-neutral-800">
          {data.nodes.map((node) => {
            const connections = getConnections(
              node.id,
              data.edges,
              data.nodes,
            );
            return (
              <li key={node.id} className="py-2">
                <Link
                  href={node.link as LinkHref}
                  className="text-sm font-medium hover:underline"
                  style={{ color: 'var(--color-brand-700)' }}
                >
                  {node.label}
                </Link>
                <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                  ({labels.type[node.type] ?? node.type} &mdash;{' '}
                  {labels.status[node.status] ?? node.status})
                </span>
                {connections.length > 0 && (
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {labels.connections}: {connections.map((c) => c.shortLabel).join(', ')}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
