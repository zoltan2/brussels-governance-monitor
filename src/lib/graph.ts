// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Locale } from '@/i18n/routing';
import type { DossierCard } from '@/lib/content';
import { getDomainCards, getDossierCards } from '@/lib/content';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GraphNode = {
  id: string;
  label: string;
  shortLabel: string;
  type: 'domain' | 'dossier';
  status: 'ongoing' | 'blocked' | 'delayed' | 'resolved';
  metrics: Array<{ value: string; label: string }>;
  summary: string;
  slug: string;
  locale: string;
  position?: { x: number; y: number };
  link: string;
};

export type GraphEdge = {
  source: string;
  target: string;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  focusId?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateLabel(label: string, maxLen = 18): string {
  if (label.length <= maxLen) return label;
  return label.slice(0, maxLen - 1) + '\u2026';
}

function mapDossierPhaseToStatus(
  phase: DossierCard['phase'],
): GraphNode['status'] {
  switch (phase) {
    case 'stalled':
    case 'cancelled':
      return 'blocked';
    case 'announced':
    case 'planned':
      return 'delayed';
    case 'completed':
      return 'resolved';
    case 'in-progress':
    default:
      return 'ongoing';
  }
}

// ---------------------------------------------------------------------------
// generateGraphData
// ---------------------------------------------------------------------------

export type GraphMode = 'homepage' | 'domains' | 'domain-detail';

export function generateGraphData(
  locale: Locale,
  mode: GraphMode,
  focusSlug?: string,
): GraphData {
  const domainCards = getDomainCards(locale);
  const dossierCards = getDossierCards(locale);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let focusId: string | undefined;

  // Always add all domain nodes
  for (const card of domainCards) {
    nodes.push({
      id: `domain-${card.domain}`,
      label: card.title,
      shortLabel: card.graphShortLabel || truncateLabel(card.title),
      type: 'domain',
      status: card.status,
      metrics: card.metrics.slice(0, 2).map((m) => ({ value: m.value, label: m.label })),
      summary: card.summary,
      slug: card.domain,
      locale,
      position: card.graphPosition,
      link: card.permalink,
    });
  }

  if (mode === 'homepage' || mode === 'domains') {
    // Edges: for each dossier with 2+ relatedDomains, create edges between
    // all pairs of those domains (deduplicated).
    const edgeSet = new Set<string>();

    for (const dossier of dossierCards) {
      const doms = dossier.relatedDomains;
      if (doms.length < 2) continue;
      for (let i = 0; i < doms.length; i++) {
        for (let j = i + 1; j < doms.length; j++) {
          const a = doms[i];
          const b = doms[j];
          // Canonical order so we don't get duplicates
          const key = a < b ? `${a}|${b}` : `${b}|${a}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({
              source: `domain-${a < b ? a : b}`,
              target: `domain-${a < b ? b : a}`,
            });
          }
        }
      }
    }
  } else if (mode === 'domain-detail' && focusSlug) {
    focusId = `domain-${focusSlug}`;

    // Add dossier nodes that reference the focus domain
    const relatedDossiers = dossierCards.filter((d) =>
      d.relatedDomains.includes(focusSlug),
    );

    for (const card of relatedDossiers) {
      nodes.push({
        id: `dossier-${card.slug}`,
        label: card.shortTitle || card.title,
        shortLabel:
          card.graphShortLabel ||
          truncateLabel(card.shortTitle || card.title),
        type: 'dossier',
        status: mapDossierPhaseToStatus(card.phase),
        metrics: card.metrics.slice(0, 2).map((m) => ({ value: m.value, label: m.label })),
        summary: card.summary,
        slug: card.slug,
        locale,
        position: card.graphPosition,
        link: card.permalink,
      });

      // Edges: dossier → each of its related domains
      for (const dom of card.relatedDomains) {
        edges.push({
          source: `domain-${dom}`,
          target: `dossier-${card.slug}`,
        });
      }
    }
  }

  return { nodes, edges, focusId };
}

// ---------------------------------------------------------------------------
// computeLayout
// ---------------------------------------------------------------------------

export function computeLayout(
  data: GraphData,
): Map<string, { x: number; y: number }> {
  const layout = new Map<string, { x: number; y: number }>();

  // 1. Collect nodes that already have a position from frontmatter
  const autoNodes: GraphNode[] = [];
  for (const node of data.nodes) {
    if (node.position) {
      layout.set(node.id, { x: node.position.x, y: node.position.y });
    } else {
      autoNodes.push(node);
    }
  }

  // 2. If there is a focal node without a position, place it at center
  if (data.focusId && !layout.has(data.focusId)) {
    const focalNode = autoNodes.find((n) => n.id === data.focusId);
    if (focalNode) {
      layout.set(data.focusId, { x: 0.5, y: 0.5 });
      // Remove from auto-positioned list
      const idx = autoNodes.indexOf(focalNode);
      if (idx !== -1) autoNodes.splice(idx, 1);
    }
  }

  // 3. Distribute remaining nodes in a circle
  const hasFocal = data.focusId !== undefined;
  const radius = hasFocal ? 0.38 : 0.4;
  const count = autoNodes.length;

  if (count > 0) {
    const startAngle = -Math.PI / 2; // Start at top
    for (let i = 0; i < count; i++) {
      const angle = startAngle + (2 * Math.PI * i) / count;
      layout.set(autoNodes[i].id, {
        x: 0.5 + radius * Math.cos(angle),
        y: 0.5 + radius * Math.sin(angle),
      });
    }
  }

  return layout;
}
