// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { getVoteStats } from '@/lib/refonte-votes';
import { Tile, TileStat, TileUnavailable } from './tile';

type RefonteState =
  | { kind: 'ok'; total: number }
  | { kind: 'no-store' }
  | { kind: 'error' };

async function loadVoteTotal(): Promise<RefonteState> {
  try {
    const stats = await getVoteStats(1);
    if (!stats.storeConfigured) return { kind: 'no-store' };
    return { kind: 'ok', total: stats.total };
  } catch {
    return { kind: 'error' };
  }
}

export async function RefonteTile({ locale }: { locale: string }) {
  const votes = await loadVoteTotal();

  if (votes.kind === 'no-store') {
    return (
      <Tile title="Refonte">
        <TileUnavailable reason="Aucun stockage configuré." />
      </Tile>
    );
  }

  if (votes.kind === 'error') {
    return (
      <Tile title="Refonte">
        <TileUnavailable reason="Base de votes injoignable." />
      </Tile>
    );
  }

  return (
    <Tile
      title="Refonte"
      href={`/${locale}/admin/refonte`}
      linkLabel="Voir les résultats"
    >
      <TileStat
        value={votes.total}
        label={votes.total === 1 ? 'vote' : 'votes'}
      />
    </Tile>
  );
}
