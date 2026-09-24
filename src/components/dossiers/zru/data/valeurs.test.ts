// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { QUARTIERS_VALEURS, PROVENANCE_QUARTIERS, SEUILS_PALIERS, INDICATEUR_QUARTIERS } from './quartiers';
import { COMMUNES_TAUX, PROVENANCE_COMMUNES } from './communes';
import { EUROPE_RATIOS, PROVENANCE_EUROPE } from './europe';
import { QUARTIERS } from './geometrie';
import { validerProvenance } from './types';

describe('valeurs ZRU', () => {
  it('chaque quartier géométrique a une ligne de valeur, et inversement', () => {
    expect(new Set(QUARTIERS_VALEURS.map((q) => q.mdId))).toEqual(new Set(QUARTIERS.map((q) => q.mdId)));
  });
  it('les quartiers sans valeur n\'ont pas de palier (jamais palier 1)', () => {
    const sans = QUARTIERS_VALEURS.filter((q) => q.valeur === null);
    expect(sans.length).toBeGreaterThan(0);
    for (const q of sans) expect(q.palier).toBeNull();
  });
  it('les quartiers avec valeur ont un palier cohérent avec les seuils', () => {
    expect(SEUILS_PALIERS).toHaveLength(4);
    for (const q of QUARTIERS_VALEURS.filter((x) => x.valeur !== null)) {
      expect(q.palier).toBe(1 + SEUILS_PALIERS.filter((s) => q.valeur! >= s).length);
    }
  });
  it('libellé de l\'indicateur dans les 4 langues', () => {
    for (const l of ['fr', 'nl', 'en', 'de'] as const) expect(INDICATEUR_QUARTIERS[l].trim()).not.toBe('');
  });
  it('19 communes, séries 2015-2023, Ixelles indisponible avant 2020', () => {
    expect(COMMUNES_TAUX).toHaveLength(19);
    for (const c of COMMUNES_TAUX) {
      expect(Object.keys(c.serie).sort()).toEqual(['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023']);
      expect(c.nom.fr.trim()).not.toBe('');
      expect(c.nom.nl.trim()).not.toBe('');
    }
    const ix = COMMUNES_TAUX.find((c) => c.niscode === '21009')!;
    expect(ix.nom).toEqual({ fr: 'Ixelles', nl: 'Elsene' });
    expect(ix.serie['2015'].statut).toBe('indisponible');
    expect(ix.serie['2023'].valeur).not.toBeNull();
  });
  it('taux communaux dans une seule unité (points de pourcentage)', () => {
    for (const c of COMMUNES_TAUX) for (const cel of Object.values(c.serie)) {
      if (cel.valeur !== null) expect(cel.valeur).toBeGreaterThan(1);
      if (cel.valeur !== null) expect(cel.valeur).toBeLessThan(100);
    }
  });
  it('rapports Europe : Bruxelles présent, valeurs positives, calcul BGM déclaré', () => {
    expect(EUROPE_RATIOS).toHaveLength(10);
    expect(EUROPE_RATIOS.find((r) => r.geo === 'BE10')!.ratio).toBeGreaterThan(1.5);
    for (const r of EUROPE_RATIOS) {
      expect(r.region).toBeGreaterThan(0);
      expect(r.nation).toBeGreaterThan(0);
      expect(r.nom.de.trim()).not.toBe('');
    }
    expect(PROVENANCE_EUROPE.modifications.join(' ')).toMatch(/calcul/);
  });
  it('provenances complètes', () => {
    for (const p of [PROVENANCE_QUARTIERS, PROVENANCE_COMMUNES, PROVENANCE_EUROPE]) expect(validerProvenance(p)).toEqual([]);
  });
});
