// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { getDraftCards } from '@/lib/content';
import type { Locale } from '@/i18n/routing';
import { Tile, TileStat, TileUnavailable } from './tile';

function loadDraftCount(locale: string): number | null {
  try {
    return getDraftCards(locale as Locale).length;
  } catch {
    return null;
  }
}

export async function DraftsTile({ locale }: { locale: string }) {
  const count = loadDraftCount(locale);

  if (count === null) {
    return (
      <Tile title="Brouillons">
        <TileUnavailable reason="Collection de contenu illisible." />
      </Tile>
    );
  }

  return (
    <Tile
      title="Brouillons"
      href={`/${locale}/review`}
      linkLabel="Ouvrir la relecture"
    >
      <TileStat
        value={count}
        label={count === 1 ? 'carte en attente' : 'cartes en attente'}
      />
    </Tile>
  );
}
