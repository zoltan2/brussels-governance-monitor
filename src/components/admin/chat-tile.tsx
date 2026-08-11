// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readLogs } from '@/lib/chat-logs';
import { Tile, TileStat, TileUnavailable } from './tile';

/**
 * Chargement isolé du rendu : les règles React Compiler interdisent à la
 * fois le try/catch autour du JSX et l'appel d'une fonction impure comme
 * Date.now() pendant le rendu. Toute la lecture et le calcul de fenêtre
 * temporelle vivent donc ici, hors du composant.
 */
async function loadQuestionsLast24h(): Promise<number | null> {
  try {
    const entries = await readLogs<{ ts?: string }>('usage', 500);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return entries.filter(
      (e) => typeof e.ts === 'string' && Date.parse(e.ts) >= cutoff,
    ).length;
  } catch {
    return null;
  }
}

export async function ChatTile({ locale }: { locale: string }) {
  const count = await loadQuestionsLast24h();

  if (count === null) {
    return (
      <Tile title="Chat">
        <TileUnavailable reason="Journaux du chat illisibles." />
      </Tile>
    );
  }

  return (
    <Tile
      title="Chat"
      href={`/${locale}/admin/chat`}
      linkLabel="Voir la télémétrie"
    >
      <TileStat
        value={count}
        label={count === 1 ? 'question sur 24 h' : 'questions sur 24 h'}
      />
    </Tile>
  );
}
