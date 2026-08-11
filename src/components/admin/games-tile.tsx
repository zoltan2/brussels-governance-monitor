// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { Tile } from './tile';

// Domaines vérifiés le 2026-08-11 dans messages/fr.json (page vie privée).
// Ces jeux sont hébergés hors du VPS BGM : un « injoignable » ici ne dit
// rien de la santé du site principal, seulement de celle du jeu.
const GAMES = [
  { name: 'Le Stuut du jour', url: 'https://stuut.governance.brussels' },
  { name: 'Amai !', url: 'https://amai.governance.brussels' },
];

async function reachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GamesTile() {
  const states = await Promise.all(GAMES.map((game) => reachable(game.url)));

  return (
    <Tile title="Jeux">
      <ul className="space-y-2 text-sm">
        {GAMES.map((game, i) => (
          <li key={game.url} className="flex justify-between gap-3">
            <a
              href={game.url}
              className="text-brand-700 underline-offset-4 hover:underline"
            >
              {game.name}
            </a>
            <span
              className={
                states[i] ? 'text-status-resolved' : 'text-status-delayed'
              }
            >
              {states[i] ? 'en ligne' : 'injoignable'}
            </span>
          </li>
        ))}
      </ul>
    </Tile>
  );
}
