// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
import type { ReactElement } from 'react';
import { FigureZru } from './figure-zru';
import {
  VIEWBOX,
  CONTOUR_REGION,
  ZRU_2020,
  ZRU_2026,
  SECTEURS_ENTRANTS,
  SECTEURS_SORTANTS,
  SURFACES_KM2,
  PROVENANCE_GEOMETRIE,
} from './data/geometrie';
import type { Locale } from './data/types';

const T: Record<
  Locale,
  {
    titre: string;
    indic: string;
    resume: string;
    cap: string;
    cols: [string, string, string];
    codes: string;
    l2020: string;
    l2026: string;
    entrants: string;
    sortants: string;
    legZru2020: string;
    legZru2026: string;
    legEntrants: string;
    legSortants: string;
  }
> = {
  fr: {
    titre: 'Zone de revitalisation urbaine : périmètres 2020 et 2026',
    indic: 'Périmètre réglementaire par secteur statistique',
    resume: 'Contours de la ZRU 2020 et de la ZRU 2026 sur la Région, avec les secteurs qui entrent et qui sortent.',
    cap: 'Surfaces et secteurs des deux périmètres',
    cols: ['Périmètre', 'Surface (km², calcul BGM)', 'Secteurs entrants ou sortants (calcul BGM)'],
    codes: 'secteurs désignés par le code INS de la commune et le code du secteur statistique',
    l2020: 'ZRU 2020',
    l2026: 'ZRU 2026',
    entrants: 'entrants',
    sortants: 'sortants',
    legZru2020: 'ZRU 2020 (trait plein)',
    legZru2026: 'ZRU 2026 (trait tireté ambre)',
    legEntrants: 'Secteurs entrants (hachures)',
    legSortants: 'Secteurs sortants (pointillés)',
  },
  nl: {
    titre: 'Zone voor stedelijke herwaardering (ZSH): perimeters 2020 en 2026',
    indic: 'Reglementaire perimeter per statistische sector',
    resume: 'Grenzen van de ZSH 2020 en 2026 over het Gewest, met de sectoren die erbij komen en die wegvallen.',
    cap: 'Oppervlakte en sectoren van beide perimeters',
    cols: ['Perimeter', 'Oppervlakte (km², berekening BGM)', 'Sectoren erbij of weg (berekening BGM)'],
    codes: 'sectoren aangeduid met de NIS-code van de gemeente en de code van de statistische sector',
    l2020: 'ZSH 2020',
    l2026: 'ZSH 2026',
    entrants: 'erbij',
    sortants: 'weg',
    legZru2020: 'ZSH 2020 (volle lijn)',
    legZru2026: 'ZSH 2026 (oranje streepjeslijn)',
    legEntrants: 'Sectoren die erbij komen (arcering)',
    legSortants: 'Sectoren die wegvallen (stippellijn)',
  },
  en: {
    titre: 'Urban revitalisation zone: 2020 and 2026 boundaries',
    indic: 'Regulatory boundary by statistical sector',
    resume: 'Outlines of the 2020 and 2026 zones across the Region, with sectors joining and leaving.',
    cap: 'Area and sectors of both boundaries',
    cols: ['Boundary', 'Area (km², BGM calculation)', 'Sectors joining or leaving (BGM calculation)'],
    codes: 'sectors identified by the municipality’s NIS code and the statistical sector code',
    l2020: 'Zone 2020',
    l2026: 'Zone 2026',
    entrants: 'joining',
    sortants: 'leaving',
    legZru2020: '2020 zone (solid line)',
    legZru2026: '2026 zone (amber dashed line)',
    legEntrants: 'Sectors joining (hatched)',
    legSortants: 'Sectors leaving (dotted)',
  },
  de: {
    titre: 'Städtische Revitalisierungszone: Abgrenzungen 2020 und 2026',
    indic: 'Rechtliche Abgrenzung nach statistischen Sektoren',
    resume: 'Umrisse der Zonen 2020 und 2026 in der Region, mit hinzukommenden und wegfallenden Sektoren.',
    cap: 'Fläche und Sektoren beider Abgrenzungen',
    cols: ['Abgrenzung', 'Fläche (km², Berechnung BGM)', 'Sektoren hinzu oder weg (Berechnung BGM)'],
    codes: 'Sektoren bezeichnet mit dem NIS-Code der Gemeinde und dem Code des statistischen Sektors',
    l2020: 'Zone 2020',
    l2026: 'Zone 2026',
    entrants: 'hinzu',
    sortants: 'weg',
    legZru2020: 'Zone 2020 (durchgezogene Linie)',
    legZru2026: 'Zone 2026 (bernsteinfarbene gestrichelte Linie)',
    legEntrants: 'Hinzukommende Sektoren (schraffiert)',
    legSortants: 'Wegfallende Sektoren (gepunktet)',
  },
};

/** Arrondit une surface à 2 décimales ; le formatage local (virgule, séparateur de milliers) revient à FigureZru. */
function arrondirKm2(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}

/** « 31 sortants : 21001-A30K, 21001-A331, … » ; identifiants triés, ponctuation de la locale. */
function listeSecteurs(secteurs: { id: string }[], libelle: string, locale: Locale): string {
  const ids = secteurs.map((s) => s.id).sort();
  return `${secteurs.length} ${libelle}${locale === 'fr' ? '\u00a0:' : ':'} ${ids.join(', ')}`;
}

export function ZruCarte2020_2026({ locale = 'fr' }: { locale?: Locale }): ReactElement {
  const t = T[locale];
  const idBase = 'zru-carte-2020-2026';
  const idMotifEntrant = `${idBase}-motif-entrant`;
  const idMotifSortant = `${idBase}-motif-sortant`;

  return (
    <FigureZru
      idBase={idBase}
      locale={locale}
      titre={t.titre}
      indicateur={t.indic}
      periode="2020, 2026"
      provenance={PROVENANCE_GEOMETRIE}
      resumeSvg={t.resume}
      svg={
        <svg viewBox={VIEWBOX}>
          <defs>
            <pattern id={idMotifEntrant} width="6" height="6" patternUnits="userSpaceOnUse">
              <path d="M0 6L6 0" className="stroke-brand-900" strokeWidth="1.5" />
            </pattern>
            <pattern id={idMotifSortant} width="6" height="6" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.2" className="fill-neutral-600" />
            </pattern>
          </defs>
          <path d={CONTOUR_REGION} className="fill-neutral-100 stroke-neutral-400" strokeWidth="1" />
          <path data-couche="zru2020" d={ZRU_2020} fill="none" fillRule="evenodd" className="stroke-neutral-600" strokeWidth="1.5" />
          {SECTEURS_ENTRANTS.map((s) => (
            <path key={s.id} data-couche="entrant" d={s.d} fill={`url(#${idMotifEntrant})`} />
          ))}
          {SECTEURS_SORTANTS.map((s) => (
            <path key={s.id} data-couche="sortant" d={s.d} fill={`url(#${idMotifSortant})`} />
          ))}
          <path data-couche="halo2026" d={ZRU_2026} fill="none" fillRule="evenodd" className="stroke-neutral-50" strokeWidth="4" />
          <path
            data-couche="zru2026"
            d={ZRU_2026}
            fill="none"
            fillRule="evenodd"
            className="stroke-status-delayed"
            strokeWidth="2"
            strokeDasharray="2 2"
          />
        </svg>
      }
      legende={
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-600">
          <li className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
              <line x1="1" y1="6" x2="11" y2="6" className="stroke-neutral-600" strokeWidth="1.5" />
            </svg>
            <span>{t.legZru2020}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
              <line x1="1" y1="6" x2="11" y2="6" className="stroke-status-delayed" strokeWidth="1.5" strokeDasharray="2 2" />
            </svg>
            <span>{t.legZru2026}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
              <rect width="12" height="12" fill={`url(#${idMotifEntrant})`} />
            </svg>
            <span>{t.legEntrants}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
              <rect width="12" height="12" fill={`url(#${idMotifSortant})`} />
            </svg>
            <span>{t.legSortants}</span>
          </li>
        </ul>
      }
      tableau={{
        caption: `${t.cap} (${t.codes})`,
        colonnes: t.cols,
        // Surfaces et listes de secteurs : calcul BGM (recouvrement majoritaire des entités du
        // Monitoring sur les contours WFS, scripts/zru/geometrie.py). Vérifié le 24/09/2026
        // (Tâche 17) : la surface 2020 (30,68 km²) est exactement l'attribut AREA officiel de la
        // couche WFS ZRU 2020 ; la surface 2026 (27,82 km²) reste un calcul BGM, à distinguer des
        // 27,7 km² publiés par perspective.brussels (secteurs complets seulement, N26 p. 31).
        // Les secteurs sont listés par identifiant : la géométrie ne porte pas leur nom.
        lignes: [
          [t.l2020, arrondirKm2(SURFACES_KM2.zru2020), listeSecteurs(SECTEURS_SORTANTS, t.sortants, locale)],
          [t.l2026, arrondirKm2(SURFACES_KM2.zru2026), listeSecteurs(SECTEURS_ENTRANTS, t.entrants, locale)],
        ],
      }}
    />
  );
}
