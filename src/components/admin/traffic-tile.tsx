// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readTrafficStatus } from '@/lib/traffic-status';
import { Tile, TileStat, TileUnavailable } from './tile';

/** Ancienneté de l'instantané, en clair. Impure (Date.now), donc calculée
 * hors du rendu et passée au composant sous forme de chaîne. */
function freshness(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "relevé il y a moins d'une heure";
  if (hours < 24) return `relevé il y a ${hours} h`;
  return `relevé il y a ${Math.floor(hours / 24)} j`;
}

async function loadTraffic() {
  const status = await readTrafficStatus();
  if (!status) return null;
  return { ...status, freshness: freshness(status.generatedAt) };
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
        <p className="mt-3 text-xs text-neutral-500">{traffic.freshness}</p>
      )}
    </Tile>
  );
}
