// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// Écrit à la main : noms, unité et provenance des taux communaux (cellules brutes dans communes-brut.ts).

import { COMMUNES_TAUX_BRUT, FEUILLE_ADI } from './communes-brut';
import { lireTauxStatbel, type CelluleStatbel } from '@/lib/zru/statbel';
import type { Provenance } from './types';

/** Toponymes officiels fr / nl par code INS. */
const NOMS: Record<string, Record<'fr' | 'nl', string>> = {
  '21001': { fr: 'Anderlecht', nl: 'Anderlecht' },
  '21002': { fr: 'Auderghem', nl: 'Oudergem' },
  '21003': { fr: 'Berchem-Sainte-Agathe', nl: 'Sint-Agatha-Berchem' },
  '21004': { fr: 'Ville de Bruxelles', nl: 'Stad Brussel' },
  '21005': { fr: 'Etterbeek', nl: 'Etterbeek' },
  '21006': { fr: 'Evere', nl: 'Evere' },
  '21007': { fr: 'Forest', nl: 'Vorst' },
  '21008': { fr: 'Ganshoren', nl: 'Ganshoren' },
  '21009': { fr: 'Ixelles', nl: 'Elsene' },
  '21010': { fr: 'Jette', nl: 'Jette' },
  '21011': { fr: 'Koekelberg', nl: 'Koekelberg' },
  '21012': { fr: 'Molenbeek-Saint-Jean', nl: 'Sint-Jans-Molenbeek' },
  '21013': { fr: 'Saint-Gilles', nl: 'Sint-Gillis' },
  '21014': { fr: 'Saint-Josse-ten-Noode', nl: 'Sint-Joost-ten-Node' },
  '21015': { fr: 'Schaerbeek', nl: 'Schaarbeek' },
  '21016': { fr: 'Uccle', nl: 'Ukkel' },
  '21017': { fr: 'Watermael-Boitsfort', nl: 'Watermaal-Bosvoorde' },
  '21018': { fr: 'Woluwe-Saint-Lambert', nl: 'Sint-Lambrechts-Woluwe' },
  '21019': { fr: 'Woluwe-Saint-Pierre', nl: 'Sint-Pieters-Woluwe' },
};

/** Taux de risque de pauvreté administratif, en points de pourcentage (29,7 = 29,7 %), années 2015 à 2023. */
export const COMMUNES_TAUX: { niscode: string; nom: Record<'fr' | 'nl', string>; serie: Record<string, CelluleStatbel> }[] =
  COMMUNES_TAUX_BRUT.map((c) => {
    const nom = NOMS[c.niscode];
    if (!nom) throw new Error(`communes : nom manquant pour ${c.niscode}`);
    const serie = Object.fromEntries(Object.entries(c.serie).map(([a, brut]) => [a, lireTauxStatbel(brut)]));
    return { niscode: c.niscode, nom, serie };
  });

export const PROVENANCE_COMMUNES: Provenance = {
  producteur: 'Statbel (Direction générale Statistique – Statistics Belgium), revenu disponible équivalent administratif (ADI)',
  url: 'https://statbel.fgov.be/fr/themes/datalab/revenu-disponible-administratif',
  sourceMiseAJour: '2025-11-19',
  extraitLe: '2026-09-24',
  licence: 'CC BY 4.0',
  modifications: [
    `fichier ADI_T2_STATBEL_FR.xlsx, feuille « ${FEUILLE_ADI} », 19 communes bruxelloises, années de revenus 2015 à 2023`,
    'cellules numériques de la source (fractions, 0,297) converties par BGM en points de pourcentage (29,7) ; cellules annotées déjà en pourcentage reprises telles quelles',
    'note ⁽¹⁾ de Statbel (10 à 15 % de personnes non prises en compte) : statut « prudence » ; note ⁽²⁾ (plus de 15 %, non publié) : aucune valeur',
    'Statbel signale que les chiffres jusqu’à 2019 ne sont comparables à ceux de 2020 et suivants que dans une certaine mesure (méthodologie améliorée)',
  ],
  confiance: 'official',
};
