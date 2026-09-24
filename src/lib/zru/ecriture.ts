// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// Formatage pur des fichiers de données générés par scripts/zru/extraire.ts.

type Palier = 1 | 2 | 3 | 4 | 5;

/** Bornes de quantiles sur les valeurs non nulles ; une valeur absente n'a jamais de palier. */
export function paliers(valeurs: (number | null)[], n = 5) {
  const tri = valeurs.filter((v): v is number => v !== null).sort((a, b) => a - b);
  const seuils = Array.from({ length: n - 1 }, (_, i) => tri[Math.floor(((i + 1) * tri.length) / n)]);
  const palierDe = (v: number | null): Palier | null => {
    if (v === null) return null;
    let p = 1;
    for (const s of seuils) if (v >= s) p++;
    return p as Palier;
  };
  return { seuils, palierDe };
}

export function fichierTs(entete: string, exports: Record<string, unknown>, types: Record<string, string> = {}): string {
  const corps = Object.entries(exports)
    .map(([nom, val]) => `export const ${nom}${types[nom] ? `: ${types[nom]}` : ''} = ${JSON.stringify(val)};`)
    .join('\n');
  return `${entete}\n\n${corps}\n`;
}

/** Retire ce qui change d'un lancement à l'autre sans que la donnée change : la ligne « Généré par … le » et les dates d'extraction. */
export function contenuComparable(s: string): string {
  return s
    .split('\n')
    .filter((l) => !/^\/\/ Généré par|^export const EXTRAIT_LE/.test(l))
    .join('\n');
}

/** Statut de --verifier : « inchangée » si seules les dates de génération ou d'extraction diffèrent. */
export function statutComparaison(avant: string | null, apres: string): 'inchangée' | 'MISE À JOUR' {
  return avant !== null && contenuComparable(avant) === contenuComparable(apres) ? 'inchangée' : 'MISE À JOUR';
}
