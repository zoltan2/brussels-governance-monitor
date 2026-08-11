// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readGitHubFile } from '@/lib/github';
import { Tile, TileStat, TileUnavailable } from './tile';

type DigestState =
  | { kind: 'none' }
  | { kind: 'pending'; week: string; state: string }
  | { kind: 'error' };

async function loadPendingDigest(): Promise<DigestState> {
  try {
    // Lecture directe plutôt qu'un fetch de /api/digest/pending : appeler sa
    // propre API en HTTP depuis un composant serveur paie un aller-retour et
    // ne transmet pas la session, donc renverrait 401.
    const file = await readGitHubFile('data/pending-digest.json');
    if (!file) return { kind: 'none' };

    // Champs vérifiés le 2026-08-11 sur data/pending-digest.json : week vaut
    // "2026-w32" (chaîne, pas un entier), approved et sent sont des booléens.
    const digest = JSON.parse(file.content) as {
      week?: unknown;
      approved?: unknown;
      sent?: unknown;
    };

    return {
      kind: 'pending',
      week: typeof digest.week === 'string' ? digest.week : '?',
      state: digest.sent
        ? 'envoyé'
        : digest.approved
          ? 'approuvé, pas encore envoyé'
          : "en attente d'approbation",
    };
  } catch {
    return { kind: 'error' };
  }
}

export async function DigestTile({ locale }: { locale: string }) {
  const digest = await loadPendingDigest();

  if (digest.kind === 'error') {
    return (
      <Tile title="Digest en cours">
        <TileUnavailable reason="Fichier en attente illisible." />
      </Tile>
    );
  }

  return (
    <Tile
      title="Digest en cours"
      href={`/${locale}/review/digest`}
      linkLabel="Ouvrir le digest"
    >
      {digest.kind === 'none' ? (
        <p className="text-sm text-neutral-600">Aucun digest en attente.</p>
      ) : (
        <TileStat value={digest.week} label={digest.state} />
      )}
    </Tile>
  );
}
