// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Instantané du trafic, déposé par bgm-umami-stats.timer sur le VPS.
 *
 * L'application ne parle jamais à Umami : elle lit un fichier sur son volume
 * de données. Aucun identifiant Umami dans son environnement, et aucun chemin
 * réseau vers l'instance d'analyse (le conteneur ne pourrait de toute façon
 * pas joindre umami-db, réseaux Docker distincts).
 *
 * Même mécanisme que infra-status.ts : répertoire déduit de DB_PATH.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface TrafficStatus {
  generatedAt: string | null;
  days: number | null;
  visitors: number;
  pageviews: number;
  topPages: { path: string; views: number }[];
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function parseTrafficStatus(raw: unknown): TrafficStatus | null {
  if (raw === null || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const visitors = asNumber(record.visitors);
  const pageviews = asNumber(record.pageviews);
  // Sans ces deux chiffres, l'instantané ne dit rien : mieux vaut afficher
  // « Indisponible » qu'un zéro qui passerait pour une mesure.
  if (visitors === null || pageviews === null) return null;

  const topPages: { path: string; views: number }[] = [];
  if (Array.isArray(record.topPages)) {
    for (const row of record.topPages) {
      if (row === null || typeof row !== 'object') continue;
      const { path, views } = row as { path?: unknown; views?: unknown };
      const count = asNumber(views);
      if (typeof path !== 'string' || count === null) continue;
      topPages.push({ path, views: count });
    }
  }

  return {
    generatedAt:
      typeof record.generatedAt === 'string' ? record.generatedAt : null,
    days: asNumber(record.days),
    visitors,
    pageviews,
    topPages,
  };
}

export async function readTrafficStatus(): Promise<TrafficStatus | null> {
  const dbPath = process.env.DB_PATH;
  if (!dbPath) return null; // dev local ou Vercel : pas de volume de données

  try {
    const file = await readFile(
      join(dirname(dbPath), 'traffic-status.json'),
      'utf8',
    );
    return parseTrafficStatus(JSON.parse(file));
  } catch {
    // Fichier absent (timer jamais passé) ou JSON illisible.
    return null;
  }
}
