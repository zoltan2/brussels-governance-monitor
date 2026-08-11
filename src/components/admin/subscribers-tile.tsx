// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { countActiveContacts } from '@/lib/resend';
import { Tile, TileStat, TileUnavailable } from './tile';

/**
 * countActiveContacts et non listActiveContacts : cette dernière fait un
 * appel API par contact, espacés de 600 ms, soit près d'une minute pour
 * quatre-vingt-dix abonnés. C'est ce qui bloquait la tuile sur son fallback.
 */
async function loadActiveCount(): Promise<number | null> {
  try {
    return await countActiveContacts();
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
