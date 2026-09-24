// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// src/components/dossiers/zru/coherence.test.ts
//
// Garde de cohérence données / texte du dossier ZRU (Tâche 20, C4). Les quatre fichiers MDX du
// dossier n'existent pas encore (branche séparée) : les tests contre les fichiers réels restent
// `skipIf`, mais les fonctions pures qui portent les assertions sont testées dès maintenant avec
// des fixtures en ligne — c'est la preuve par mutation exigée par le brief (Step 2), simulée
// faute de fichier réel à muter.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { matter } from '@/lib/frontmatter';
import { formaterNombre } from './figure-zru';
import { PROVENANCE_GEOMETRIE, SURFACES_KM2 } from './data/geometrie';
import { PROVENANCE_QUARTIERS } from './data/quartiers';
import { PROVENANCE_COMMUNES } from './data/communes';
import { PROVENANCE_EUROPE } from './data/europe';
import type { Locale } from './data/types';

const fichier = (l: Locale) => join(process.cwd(), `content/dossiers/zone-revitalisation-urbaine.${l}.mdx`);
const LOCALES: Locale[] = ['fr', 'nl', 'en', 'de'];
const present = LOCALES.every((l) => existsSync(fichier(l)));
const derniere = [PROVENANCE_GEOMETRIE, PROVENANCE_QUARTIERS, PROVENANCE_COMMUNES, PROVENANCE_EUROPE]
  .map((p) => p.extraitLe)
  .sort()
  .at(-1)!;

const CARD_PAUVRETE_FR = join(process.cwd(), 'content/comparison-cards/poverty-capital-regions.fr.mdx');

/**
 * Cœur de la garde « lastModified » : la date de mise à jour du dossier ne peut jamais être
 * antérieure à la dernière extraction de données (sinon le texte pourrait décrire un jeu de
 * données plus ancien que ce qu'affiche la page).
 */
export function lastModifiedEstAJour(lastModified: unknown, derniereExtraction: string): boolean {
  if (typeof lastModified !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(lastModified)) return false;
  return lastModified.slice(0, 10) >= derniereExtraction;
}

/**
 * Cœur de la garde « surfaces » : le texte doit citer, dans la forme locale, les deux surfaces
 * réellement calculées à partir des géométries WFS (ZRU 2020 officielle, ZRU 2026 calcul BGM).
 * Rejugé par le contrôleur (task-20-brief citait 30,91, qui ne correspond à aucune donnée) :
 * les valeurs attendues sont désormais lues dans `SURFACES_KM2`, jamais recopiées en dur ici.
 */
export function surfacesCiteesDansLeTexte(texte: string, locale: Locale): string[] {
  const erreurs: string[] = [];
  const v2020 = formaterNombre(SURFACES_KM2.zru2020, locale);
  const v2026 = formaterNombre(SURFACES_KM2.zru2026, locale);
  if (!texte.includes(v2020)) erreurs.push(`surface ZRU 2020 (${v2020}) absente du texte ${locale}`);
  if (!texte.includes(v2026)) erreurs.push(`surface ZRU 2026 (${v2026}) absente du texte ${locale}`);
  return erreurs;
}

/**
 * Cœur de la garde « AROP 2019 » : si le texte français cite le repère 31,4, chaque langue doit
 * en citer la forme localisée (virgule décimale en fr/nl/de, point en en-GB) — jamais rien
 * affirmer si le français ne cite pas ce repère (le contrôleur l'exige explicitement).
 */
export function aropCiteCoherent(texteFr: string, texteLocale: string, locale: Locale): string[] {
  if (!texteFr.includes('31,4')) return [];
  const attendu = formaterNombre(31.4, locale);
  return texteLocale.includes(attendu) ? [] : [`AROP 2019 (${attendu}) absent du texte ${locale}`];
}

/**
 * Cœur de la garde « concordance poverty-capital-regions » (Step 3 du brief) : si le dossier ZRU
 * cite une valeur AROPE/AROP 2025 pour BE10, cette même valeur doit se retrouver dans la fiche de
 * comparaison `poverty-capital-regions`. Rien n'est affirmé si le dossier ne cite pas cette
 * valeur — la fiche ne porte que l'AROPE (33,6 %) dans ses `dataPoints`, l'AROP (23,3 %) n'y vit
 * que dans le texte (`caveat`), donc la comparaison se fait sur le contenu brut de la fiche.
 */
export function concordancePauvreteBE10(texteDossierFr: string, valeurCitee: string, cardRawFr: string): string[] {
  if (!texteDossierFr.includes(valeurCitee)) return [];
  return cardRawFr.includes(valeurCitee)
    ? []
    : [`valeur BE10 2025 (${valeurCitee}) citée par le dossier mais absente de la fiche poverty-capital-regions`];
}

describe('dossier ZRU — fonctions pures de la garde de cohérence (fixtures, sans MDX réel)', () => {
  it('surfacesCiteesDansLeTexte : passe quand les deux surfaces localisées sont citées', () => {
    const texte = `La ZRU 2020 couvrait ${formaterNombre(SURFACES_KM2.zru2020, 'fr')} km², contre ${formaterNombre(SURFACES_KM2.zru2026, 'fr')} km² en 2026.`;
    expect(surfacesCiteesDansLeTexte(texte, 'fr')).toEqual([]);
  });

  it('surfacesCiteesDansLeTexte : détecte les deux surfaces manquantes (preuve par mutation)', () => {
    expect(surfacesCiteesDansLeTexte('texte sans aucune surface citée', 'fr')).toHaveLength(2);
  });

  it('lastModifiedEstAJour : accepte une date égale, refuse une date antérieure ou absente (preuve par mutation)', () => {
    expect(lastModifiedEstAJour('2026-09-24', '2026-09-24')).toBe(true);
    expect(lastModifiedEstAJour('2026-09-23', '2026-09-24')).toBe(false);
    expect(lastModifiedEstAJour(undefined, '2026-09-24')).toBe(false);
  });

  it('aropCiteCoherent : ne rien affirmer si le français ne cite pas 31,4', () => {
    expect(aropCiteCoherent('texte fr sans le repère AROP', 'texte en quelconque', 'en')).toEqual([]);
  });

  it('aropCiteCoherent : exige la forme localisée quand le français cite 31,4 (preuve par mutation)', () => {
    expect(aropCiteCoherent('… AROP 2019 : 31,4 % de la population …', '… AROP 2019: 31.4% of the population …', 'en')).toEqual(
      [],
    );
    expect(
      aropCiteCoherent('… AROP 2019 : 31,4 % de la population …', '… texte en sans le repère …', 'en'),
    ).toHaveLength(1);
  });

  it('concordancePauvreteBE10 : ne rien affirmer si le dossier ne cite pas la valeur', () => {
    expect(concordancePauvreteBE10('texte sans ce chiffre', '23,3', 'fiche sans ce chiffre non plus')).toEqual([]);
  });

  it('concordancePauvreteBE10 : détecte une valeur citée par le dossier mais absente de la fiche (preuve par mutation)', () => {
    expect(
      concordancePauvreteBE10('… AROP 2025 pour Bruxelles-Capitale : 23,3 % …', '23,3', 'fiche sans ce chiffre'),
    ).toHaveLength(1);
  });

  it('concordancePauvreteBE10 : passe quand la fiche reprend la même valeur', () => {
    expect(
      concordancePauvreteBE10('… AROP 2025 pour Bruxelles-Capitale : 23,3 % …', '23,3', '… 23,3 % … dans le texte de la fiche …'),
    ).toEqual([]);
  });
});

it('SURFACES_KM2.zru2026 (calcul BGM) reste proche de la surface officielle du rapport de périmètre (27,7 km²)', () => {
  expect(Math.abs(SURFACES_KM2.zru2026 - 27.7)).toBeLessThan(0.3);
});

describe.skipIf(!present)('dossier ZRU — cohérence contre les fichiers réels', () => {
  const texteFr = present ? matter(readFileSync(fichier('fr'), 'utf8')).content : '';
  const cardRawFr = existsSync(CARD_PAUVRETE_FR) ? readFileSync(CARD_PAUVRETE_FR, 'utf8') : '';

  for (const l of LOCALES) {
    const brut = present ? readFileSync(fichier(l), 'utf8') : '';
    const { data, content } = matter(brut);

    it(`${l} : lastModified ≥ dernière extraction (${derniere})`, () => {
      expect(lastModifiedEstAJour(data.lastModified, derniere)).toBe(true);
    });

    it(`${l} : les surfaces de la ZRU citées dans le texte correspondent aux données`, () => {
      expect(surfacesCiteesDansLeTexte(content, l)).toEqual([]);
    });

    it(`${l} : le repère AROP 2019 (31,4), s'il est cité en français, est cohérent entre langues`, () => {
      expect(aropCiteCoherent(texteFr, content, l)).toEqual([]);
    });
  }

  it('BE10 : la valeur AROP/AROPE 2025 citée par le dossier, si citée, concorde avec la fiche poverty-capital-regions', () => {
    expect(concordancePauvreteBE10(texteFr, '23,3', cardRawFr)).toEqual([]);
  });
});
