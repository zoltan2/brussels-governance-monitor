// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

export type CelluleStatbel = { valeur: number | null; statut: 'ok' | 'prudence' | 'indisponible' };

/** ⁽¹⁾ = « à interpréter avec prudence » ; ⁽²⁾ = non disponible (notes Statbel ADI). */
export function lireCelluleStatbel(brut: string | number | null): CelluleStatbel {
  if (brut === null || brut === '') return { valeur: null, statut: 'indisponible' };
  if (typeof brut === 'number') return { valeur: brut, statut: 'ok' };
  const s = brut.trim();
  if (s === '⁽²⁾') return { valeur: null, statut: 'indisponible' };
  const m = s.match(/^(\d+(?:,\d+)?)\s?%(⁽¹⁾)?$/);
  if (!m) throw new Error(`Statbel : cellule inattendue « ${s} »`);
  return { valeur: Number(m[1].replace(',', '.')), statut: m[2] ? 'prudence' : 'ok' };
}
