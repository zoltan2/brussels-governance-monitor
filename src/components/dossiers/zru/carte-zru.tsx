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
    cols: ['Périmètre', 'Surface (km²)', 'Secteurs entrants ou sortants'],
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
    titre: 'Stedelijke herwaarderingszone: perimeters 2020 en 2026',
    indic: 'Reglementaire perimeter per statistische sector',
    resume: 'Grenzen van de ZSH 2020 en 2026 over het Gewest, met de sectoren die erbij komen en die wegvallen.',
    cap: 'Oppervlakte en sectoren van beide perimeters',
    cols: ['Perimeter', 'Oppervlakte (km²)', 'Sectoren erbij of weg'],
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
    cols: ['Boundary', 'Area (km²)', 'Sectors joining or leaving'],
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
    cols: ['Abgrenzung', 'Fläche (km²)', 'Sektoren hinzu oder weg'],
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
        caption: t.cap,
        colonnes: t.cols,
        lignes: [
          [t.l2020, arrondirKm2(SURFACES_KM2.zru2020), `${SECTEURS_SORTANTS.length} ${t.sortants}`],
          [t.l2026, arrondirKm2(SURFACES_KM2.zru2026), `${SECTEURS_ENTRANTS.length} ${t.entrants}`],
        ],
      }}
    />
  );
}
