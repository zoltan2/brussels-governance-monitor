// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
import type { ReactElement } from 'react';
import { FigureZru } from './figure-zru';
import { EUROPE_RATIOS, ANNEE_EUROPE, PROVENANCE_EUROPE } from './data/europe';
import type { Locale } from './data/types';

const T: Record<
  Locale,
  {
    titre: string;
    indic: string;
    resume: string;
    sens: string;
    bxl: string;
    cap: string;
    cols: [string, string, string, string];
    legBxl: string;
    legAutres: string;
    legRef: string;
  }
> = {
  fr: {
    titre: 'Taux de risque de pauvreté : région-capitale rapportée à son pays',
    indic: 'Rapport entre le taux de la région-capitale et celui du pays (calcul BGM)',
    resume: 'Un point par région-capitale sur un axe de 0,5 à 2,5, avec une ligne de référence à 1.',
    sens: 'Au-dessus de 1, la région-capitale a un taux plus élevé que son pays. Chaque région est comparée au seuil de son propre pays.',
    bxl: 'Bruxelles : environ deux fois le taux belge.',
    cap: 'Taux régional, taux national et rapport',
    cols: ['Région', 'Taux régional (%)', 'Taux national (%)', 'Rapport'],
    legBxl: 'Bruxelles-Capitale',
    legAutres: 'Autres régions-capitales',
    legRef: 'Rapport de 1 (même taux que le pays)',
  },
  nl: {
    titre: 'Armoederisico: hoofdstedelijke regio tegenover het land',
    indic: 'Verhouding tussen het cijfer van de hoofdstedelijke regio en dat van het land (berekening BGM)',
    resume: 'Eén punt per hoofdstedelijke regio op een as van 0,5 tot 2,5, met een referentielijn op 1.',
    sens: 'Boven 1 heeft de hoofdstedelijke regio een hoger cijfer dan haar land. Elke regio wordt vergeleken met de drempel van haar eigen land.',
    bxl: 'Brussel: ongeveer twee keer het Belgische cijfer.',
    cap: 'Regionaal cijfer, nationaal cijfer en verhouding',
    cols: ['Regio', 'Regionaal cijfer (%)', 'Nationaal cijfer (%)', 'Verhouding'],
    legBxl: 'Brussels Hoofdstedelijk Gewest',
    legAutres: 'Andere hoofdstedelijke regio’s',
    legRef: 'Verhouding van 1 (zelfde cijfer als het land)',
  },
  en: {
    titre: 'At-risk-of-poverty rate: capital region relative to its country',
    indic: 'Ratio of the capital region’s rate to the national rate (BGM calculation)',
    resume: 'One dot per capital region on an axis from 0.5 to 2.5, with a reference line at 1.',
    sens: 'A ratio above 1 means the capital region has a higher rate than its country. Each region is compared with its own country’s threshold.',
    bxl: 'Brussels: about twice the Belgian rate.',
    cap: 'Regional rate, national rate and ratio',
    cols: ['Region', 'Regional rate (%)', 'National rate (%)', 'Ratio'],
    legBxl: 'Brussels-Capital Region',
    legAutres: 'Other capital regions',
    legRef: 'Ratio of 1 (same rate as the country)',
  },
  de: {
    titre: 'Armutsgefährdungsquote: Hauptstadtregion im Verhältnis zu ihrem Land',
    indic: 'Verhältnis der Quote der Hauptstadtregion zur Landesquote (Berechnung BGM)',
    resume: 'Ein Punkt je Hauptstadtregion auf einer Achse von 0,5 bis 2,5, mit einer Bezugslinie bei 1.',
    sens: 'Über 1 hat die Hauptstadtregion eine höhere Quote als ihr Land. Jede Region wird mit der Schwelle ihres eigenen Landes verglichen.',
    bxl: 'Brüssel: etwa das Doppelte der belgischen Quote.',
    cap: 'Regionale Quote, Landesquote und Verhältnis',
    cols: ['Region', 'Regionale Quote (%)', 'Landesquote (%)', 'Verhältnis'],
    legBxl: 'Region Brüssel-Hauptstadt',
    legAutres: 'Andere Hauptstadtregionen',
    legRef: 'Verhältnis von 1 (gleiche Quote wie das Land)',
  },
};

const W = 600;
const X0 = 0.5;
const X1 = 2.5;
const x = (r: number) => ((r - X0) / (X1 - X0)) * W;

/** Arrondit un taux à 1 décimale ; le formatage local (virgule, espace insécable) revient à FigureZru. */
function arrondirTaux(valeur: number): number {
  return Math.round(valeur * 10) / 10;
}

/** Arrondit un rapport à 2 décimales ; le formatage local revient à FigureZru. */
function arrondirRatio(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}

// Vérifie que « environ deux fois » (texte fr/nl/en/de ci-dessus) reste vrai : le rapport de
// Bruxelles doit rester entre 1,8 et 2,2. Si les données changent au point de sortir de cette
// fourchette, le texte fixe doit être revu avant d'être republié.
const RAPPORT_BXL = EUROPE_RATIOS.find((r) => r.geo === 'BE10')?.ratio;
if (RAPPORT_BXL === undefined || RAPPORT_BXL < 1.8 || RAPPORT_BXL > 2.2) {
  throw new Error(
    `ZruPointsEurope : le rapport de Bruxelles (${RAPPORT_BXL}) est hors de la fourchette 1,8-2,2 validée pour le texte « environ deux fois ».`,
  );
}

/**
 * Point européen : rapport entre le taux de risque de pauvreté de chaque région-capitale et celui
 * de son pays, un point par région autour d'une ligne de référence à 1. Aucun classement : les
 * points comme le tableau sont triés par ordre alphabétique du nom localisé, jamais par rapport.
 */
export function ZruPointsEurope({ locale = 'fr' }: { locale?: Locale }): ReactElement {
  const t = T[locale];
  const parNom = [...EUROPE_RATIOS].sort((a, b) => a.nom[locale].localeCompare(b.nom[locale], locale));
  const H = parNom.length * 24 + 10;

  return (
    <FigureZru
      idBase="zru-points-europe"
      locale={locale}
      titre={t.titre}
      indicateur={t.indic}
      periode={String(ANNEE_EUROPE)}
      provenance={PROVENANCE_EUROPE}
      resumeSvg={t.resume}
      svg={
        <svg viewBox={`0 0 ${W} ${H}`}>
          <line
            data-reference="1"
            x1={x(1)}
            x2={x(1)}
            y1={0}
            y2={H}
            className="stroke-neutral-500"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          {parNom.map((r, i) => (
            <circle
              key={r.geo}
              data-geo={r.geo}
              cx={x(r.ratio)}
              cy={i * 24 + 16}
              r={r.geo === 'BE10' ? 7 : 5}
              className={r.geo === 'BE10' ? 'fill-status-delayed stroke-neutral-50' : 'fill-brand-700 stroke-neutral-50'}
              strokeWidth="2"
            />
          ))}
        </svg>
      }
      legende={
        <div className="mt-3">
          <p className="text-xs text-neutral-600">
            {t.sens} {t.bxl}
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-600">
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
                <circle cx="6" cy="6" r="5" className="fill-status-delayed stroke-neutral-50" strokeWidth="1" />
              </svg>
              <span>{t.legBxl}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
                <circle cx="6" cy="6" r="5" className="fill-brand-700 stroke-neutral-50" strokeWidth="1" />
              </svg>
              <span>{t.legAutres}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
                <line x1="1" y1="6" x2="11" y2="6" className="stroke-neutral-500" strokeWidth="1.5" strokeDasharray="2 2" />
              </svg>
              <span>{t.legRef}</span>
            </li>
          </ul>
        </div>
      }
      tableau={{
        caption: t.cap,
        colonnes: t.cols,
        lignes: parNom.map((r) => [r.nom[locale], arrondirTaux(r.region), arrondirTaux(r.nation), arrondirRatio(r.ratio)]),
      }}
    />
  );
}
