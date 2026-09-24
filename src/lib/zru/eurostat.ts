// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/** Sous-ensemble du format JSON-stat 2.0 renvoyé par l'API Eurostat. */
export interface JsonStat {
  id: string[];
  size: number[];
  dimension: Record<string, { category: { index: Record<string, number> | string[] } }>;
  value: Record<string, number | null> | (number | null)[];
  updated?: string;
}

function indexDe(ds: JsonStat, dim: string, modalite: string | undefined, taille: number): number {
  const index = ds.dimension[dim]?.category.index;
  if (modalite === undefined) {
    if (taille === 1) return 0; // dimension fixée par la requête (freq, unit…)
    throw new Error(`dimension ${dim} : modalité non précisée`);
  }
  const i = Array.isArray(index) ? index.indexOf(modalite) : index?.[modalite];
  if (i === undefined || i < 0) throw new Error(`dimension ${dim} : modalité ${modalite} absente du jeu`);
  return i;
}

/** Valeur aux coordonnées données, ou null si la source ne publie pas cette case. */
export function valeur(ds: JsonStat, coords: Record<string, string>): number | null {
  let pos = 0;
  ds.id.forEach((dim, k) => {
    pos = pos * ds.size[k] + indexDe(ds, dim, coords[dim], ds.size[k]);
  });
  const v = Array.isArray(ds.value) ? ds.value[pos] : ds.value[String(pos)];
  return v === undefined || v === null ? null : v;
}

export function valeurRequise(ds: JsonStat, coords: Record<string, string>): number {
  const v = valeur(ds, coords);
  if (v === null) throw new Error(`valeur absente pour ${JSON.stringify(coords)}`);
  return v;
}

export function derniereMiseAJour(ds: JsonStat): string | null {
  return ds.updated ? ds.updated.slice(0, 10) : null;
}
