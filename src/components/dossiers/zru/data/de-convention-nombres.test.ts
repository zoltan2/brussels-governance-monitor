// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// src/components/dossiers/zru/data/de-convention-nombres.test.ts
//
// Garde de convention : en allemand, les grands nombres suivent la séparation par point
// (« 28.507.755 »), celle que `formaterNombre` rend pour de-DE, jamais une espace ou une espace
// insécable comme en français. Décision du contrôleur sur le PR #601.
import { describe, expect, it } from 'vitest';
import { PROGRAMMES } from './programmes';
import { SOURCES_MATRICE, NIVEAUX, LIGNES, CAPTION, COL_THEME, CASE_VIDE, LIBELLE_SOURCES } from './competences';
import { INDICATEUR_QUARTIERS, PROVENANCE_QUARTIERS } from './quartiers';

/** Espace ordinaire ou insécable suivie d'exactement 3 chiffres, non précédée ni suivie d'un autre chiffre : un séparateur de milliers par espace. */
const SEPARATEUR_ESPACE = /\d[  ]\d{3}(?!\d)/;

/**
 * Parcourt n'importe quelle structure de données et collecte toutes les chaînes portées par une
 * clé `de` (chaîne unique ou tableau de chaînes), où qu'elle se trouve dans l'arbre.
 */
function chainesDe(valeur: unknown, acc: string[] = []): string[] {
  if (Array.isArray(valeur)) {
    for (const item of valeur) chainesDe(item, acc);
    return acc;
  }
  if (valeur !== null && typeof valeur === 'object') {
    for (const [cle, v] of Object.entries(valeur as Record<string, unknown>)) {
      if (cle === 'de') {
        if (typeof v === 'string') acc.push(v);
        else if (Array.isArray(v)) {
          for (const s of v) if (typeof s === 'string') acc.push(s);
        }
      }
      chainesDe(v, acc);
    }
  }
  return acc;
}

describe('convention allemande des grands nombres, data/*.ts du dossier ZRU', () => {
  const sources: [string, unknown][] = [
    ['programmes.ts', PROGRAMMES],
    ['competences.ts (SOURCES_MATRICE)', SOURCES_MATRICE],
    ['competences.ts (NIVEAUX)', NIVEAUX],
    ['competences.ts (LIGNES)', LIGNES],
    ['competences.ts (CAPTION)', CAPTION],
    ['competences.ts (COL_THEME)', COL_THEME],
    ['competences.ts (CASE_VIDE)', CASE_VIDE],
    ['competences.ts (LIBELLE_SOURCES)', LIBELLE_SOURCES],
    ['quartiers.ts (INDICATEUR_QUARTIERS)', INDICATEUR_QUARTIERS],
    ['quartiers.ts (PROVENANCE_QUARTIERS)', PROVENANCE_QUARTIERS],
  ];

  for (const [nom, valeur] of sources) {
    it(`${nom} : aucune chaîne allemande ne sépare les milliers par une espace`, () => {
      const chaines = chainesDe(valeur);
      expect(chaines.length).toBeGreaterThan(0);
      const fautives = chaines.filter((s) => SEPARATEUR_ESPACE.test(s));
      expect(fautives).toEqual([]);
    });
  }

  it('témoin : le motif détecte bien une espace comme séparateur de milliers', () => {
    expect(SEPARATEUR_ESPACE.test('28 507 755 Euro')).toBe(true);
    expect(SEPARATEUR_ESPACE.test('28 507 755 Euro')).toBe(true);
    expect(SEPARATEUR_ESPACE.test('28.507.755 Euro')).toBe(false);
    expect(SEPARATEUR_ESPACE.test('mindestens 5 % des Programmbetrags')).toBe(false);
  });
});
