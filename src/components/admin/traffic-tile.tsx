// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readTrafficStatus } from '@/lib/traffic-status';
import { Tile, TileStat, TileUnavailable } from './tile';
import {
  describeFreshness,
  freshnessClassName,
} from '@/lib/snapshot-freshness';

async function loadTraffic() {
  const status = await readTrafficStatus();
  if (!status) return null;
  // L'instantané est horaire : au-delà d'un jour, le timer ne tourne plus.
  return {
    ...status,
    freshness: describeFreshness(status.generatedAt, { staleAfterHours: 26 }),
  };
}

export async function TrafficTile() {
  const traffic = await loadTraffic();

  if (!traffic) {
    return (
      <Tile title="Trafic">
        <TileUnavailable reason="Aucun instantané sur le volume de données." />
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
      <TileStat
        value={traffic.visitors}
        label={`visiteurs sur ${traffic.days ?? 7} jours`}
      />
      <p className="mt-1 text-sm text-neutral-600">
        {traffic.pageviews} pages vues
      </p>
      {traffic.topPages.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-neutral-600">
          {traffic.topPages.map((page) => (
            <li key={page.path} className="flex justify-between gap-3">
              <span className="truncate">{page.path}</span>
              <span className="shrink-0 tabular-nums">{page.views}</span>
            </li>
          ))}
        </ul>
      )}
      {traffic.freshness && (
        <p className={freshnessClassName(traffic.freshness.level)}>
          {traffic.freshness.label}
        </p>
      )}
    </Tile>
  );
}
