// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { listContentPrs } from '@/lib/github-pr';
import { Tile, TileStat } from './tile';

export async function ContentTile({ locale }: { locale: string }) {
  let count: number | null = null;
  try {
    count = (await listContentPrs()).length;
  } catch {
    // Jeton absent ou API en panne : on affiche « Indisponible » plutôt
    // qu'un zéro trompeur, qui se lirait « rien à publier ».
    count = null;
  }

  return (
    <Tile
      title="Veilles à publier"
      href={`/${locale}/admin/content`}
      linkLabel="Voir"
    >
      <TileStat
        value={count === null ? 'Indisponible' : String(count)}
        label={
          count === null
            ? 'impossible de joindre GitHub'
            : count === 1
              ? 'veille en attente'
              : 'veilles en attente'
        }
      />
    </Tile>
  );
}
