// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { listActiveContacts } from '@/lib/resend';
import { Tile, TileStat, TileUnavailable } from './tile';

async function loadActiveCount(): Promise<number | null> {
  try {
    return (await listActiveContacts()).length;
  } catch {
    return null;
  }
}

export async function SubscribersTile() {
  const count = await loadActiveCount();

  if (count === null) {
    return (
      <Tile title="Abonnés">
        <TileUnavailable reason="Resend n'a pas répondu." />
      </Tile>
    );
  }

  return (
    <Tile title="Abonnés">
      <TileStat
        value={count}
        label={count === 1 ? 'abonné actif' : 'abonnés actifs'}
      />
    </Tile>
  );
}
