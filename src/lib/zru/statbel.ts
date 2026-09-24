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

/**
 * Taux ADI en points de pourcentage. Dans la feuille « Risque de pauvreté administratif », Statbel
 * stocke les cellules ordinaires en fraction (0,297 = 29,7 %) et les cellules annotées ⁽¹⁾ en texte
 * déjà exprimé en pourcentage (« 17,6%⁽¹⁾ ») : les deux doivent être ramenés à la même unité.
 */
export function lireTauxStatbel(brut: string | number | null): CelluleStatbel {
  const c = lireCelluleStatbel(brut);
  if (typeof brut !== 'number') return c;
  if (brut < 0 || brut > 1) throw new Error(`Statbel : taux ${brut} hors de [0, 1], pas une fraction`);
  return { valeur: Math.round(brut * 1000) / 10, statut: c.statut };
}

type Ligne = (string | number | null)[];
const ANNEES_ADI = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'];
const estTaux = (c: string | number | null) =>
  (typeof c === 'number' && c >= 0 && c <= 1) || (typeof c === 'string' && /^(\d+(,\d+)?\s?%(⁽¹⁾)?|⁽²⁾)$/.test(c.trim()));

/**
 * Repère, par son contenu, une feuille de taux communaux ADI : une ligne d'en-tête portant les années
 * 2015 à 2023 (« 2020* » compris) et exactement 19 lignes bruxelloises (INS 21001 à 21019) dont toutes
 * les cellules d'année sont des taux. Renvoie null si la feuille ne correspond pas.
 */
export function trouverTauxCommunesBruxelles(lignes: Ligne[]): { annees: { col: number; annee: string }[]; communes: Ligne[] } | null {
  for (const tete of lignes) {
    const annees = tete.flatMap((c, col) => {
      const m = String(c ?? '').trim().match(/^(20\d\d)\*?$/);
      return m ? [{ col, annee: m[1] }] : [];
    });
    if (annees.map((a) => a.annee).join() !== ANNEES_ADI.join()) continue;
    const communes = lignes.filter((l) => /^210(0[1-9]|1\d)$/.test(String(l[0] ?? '')));
    if (communes.length !== 19 || new Set(communes.map((l) => String(l[0]))).size !== 19) return null;
    if (!communes.every((l) => annees.every(({ col }) => estTaux(l[col] ?? null)))) return null;
    return { annees, communes };
  }
  return null;
}
