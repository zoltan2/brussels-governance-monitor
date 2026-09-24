// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { lireCelluleStatbel, lireTauxStatbel, trouverTauxCommunesBruxelles } from './statbel';

describe('lireCelluleStatbel', () => {
  it('nombre brut', () => expect(lireCelluleStatbel(0.328)).toEqual({ valeur: 0.328, statut: 'ok' }));
  it('pourcentage texte avec réserve (1)', () =>
    expect(lireCelluleStatbel('17,6%⁽¹⁾')).toEqual({ valeur: 17.6, statut: 'prudence' }));
  it('pourcentage texte sans réserve', () => expect(lireCelluleStatbel('32,8 %')).toEqual({ valeur: 32.8, statut: 'ok' }));
  it('non disponible (2)', () => expect(lireCelluleStatbel('⁽²⁾')).toEqual({ valeur: null, statut: 'indisponible' }));
  it('case vide', () => expect(lireCelluleStatbel(null)).toEqual({ valeur: null, statut: 'indisponible' }));
  it('texte inconnu : échec, jamais de valeur inventée', () => expect(() => lireCelluleStatbel('n.d.')).toThrow(/n\.d\./));
});

describe('lireTauxStatbel (taux ADI en points de pourcentage)', () => {
  it('cellule numérique = fraction : convertie en pourcentage', () =>
    expect(lireTauxStatbel(0.297)).toEqual({ valeur: 29.7, statut: 'ok' }));
  it('fraction sans bruit flottant', () => expect(lireTauxStatbel(0.18)).toEqual({ valeur: 18, statut: 'ok' }));
  it('texte avec réserve déjà en pourcentage : inchangé', () =>
    expect(lireTauxStatbel('17,6%⁽¹⁾')).toEqual({ valeur: 17.6, statut: 'prudence' }));
  it('non publié (2)', () => expect(lireTauxStatbel('⁽²⁾')).toEqual({ valeur: null, statut: 'indisponible' }));
  it('nombre hors [0, 1] : échec, ce n\'est pas une fraction', () => expect(() => lireTauxStatbel(12)).toThrow(/12/));
});

describe('trouverTauxCommunesBruxelles', () => {
  const tete = ['Code INS', 'Commune', 2015, 2016, 2017, 2018, 2019, '2020*', 2021, 2022, 2023];
  const bxl = (vals: (string | number)[]) =>
    Array.from({ length: 19 }, (_, i) => [21001 + i, `C${i}`, ...vals]);
  const taux = [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, '17,6%⁽¹⁾'];
  it('reconnaît une feuille de taux : années 2015-2023 et 19 communes', () => {
    const r = trouverTauxCommunesBruxelles([['titre'], [], tete, [11001, 'Aartselaar', ...taux], ...bxl(taux)]);
    expect(r).not.toBeNull();
    expect(r!.annees.map((a) => a.annee)).toEqual(['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023']);
    expect(r!.communes).toHaveLength(19);
    expect(r!.communes[0][0]).toBe(21001);
  });
  it('rejette une feuille en euros (médian, quartiles)', () =>
    expect(trouverTauxCommunesBruxelles([tete, ...bxl([15828, 16282, 16733, 17389, 18199, 18759, 19502, 20446, 21995])])).toBeNull());
  it('rejette une feuille à 18 communes', () =>
    expect(trouverTauxCommunesBruxelles([tete, ...bxl(taux).slice(1)])).toBeNull());
});
