// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { getUmamiSummary } from '@/lib/umami';
import { Tile, TileStat, TileUnavailable } from './tile';

export async function TrafficTile() {
  const summary = await getUmamiSummary(7);

  if (!summary) {
    return (
      <Tile title="Trafic">
        <TileUnavailable reason="Umami injoignable ou identifiants absents." />
      </Tile>
    );
  }

  return (
    <Tile
      title="Trafic"
      href="https://analytics.governance.brussels"
      linkLabel="Ouvrir Umami"
      external
    >
      <TileStat value={summary.visitors} label="visiteurs sur 7 jours" />
      <p className="mt-1 text-sm text-neutral-600">
        {summary.pageviews} pages vues
      </p>
      {summary.topPages.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-neutral-600">
          {summary.topPages.map((page) => (
            <li key={page.path} className="flex justify-between gap-3">
              <span className="truncate">{page.path}</span>
              <span className="shrink-0 tabular-nums">{page.views}</span>
            </li>
          ))}
        </ul>
      )}
    </Tile>
  );
}
