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
    titre: 'Taux de risque de pauvreté : région de la capitale rapportée à son pays',
    indic: 'Rapport entre le taux de la région de la capitale et celui du pays (calcul BGM)',
    resume: 'Un point par région de la capitale sur un axe de 0,5 à 2,5, avec une ligne de référence à 1.',
    sens: 'Au-dessus de 1, la région de la capitale a un taux plus élevé que son pays. Chaque région est comparée au seuil de son propre pays.',
    bxl: 'Bruxelles : environ deux fois le taux belge.',
    cap: 'Taux régional, taux national et rapport',
    cols: ['Région', 'Taux régional (%)', 'Taux national (%)', 'Rapport'],
    legBxl: 'Bruxelles-Capitale',
    legAutres: 'Autres régions de la capitale',
    legRef: 'Rapport de 1 (même taux que le pays)',
  },
  nl: {
    titre: 'Armoederisico: regio van de hoofdstad tegenover het land',
    indic: 'Verhouding tussen het cijfer van de regio van de hoofdstad en dat van het land (berekening BGM)',
    resume: 'Eén punt per regio van de hoofdstad op een as van 0,5 tot 2,5, met een referentielijn op 1.',
    sens: 'Boven 1 heeft de regio van de hoofdstad een hoger cijfer dan haar land. Elke regio wordt vergeleken met de drempel van haar eigen land.',
    bxl: 'Brussel: ongeveer twee keer het Belgische cijfer.',
    cap: 'Regionaal cijfer, nationaal cijfer en verhouding',
    cols: ['Regio', 'Regionaal cijfer (%)', 'Nationaal cijfer (%)', 'Verhouding'],
    legBxl: 'Brussels Hoofdstedelijk Gewest',
    legAutres: 'Andere regio’s van de hoofdstad',
    legRef: 'Verhouding van 1 (zelfde cijfer als het land)',
  },
  en: {
    titre: 'At-risk-of-poverty rate: the capital’s region relative to its country',
    indic: 'Ratio between the rate of the capital’s region and the national rate (BGM calculation)',
    resume: 'One dot per capital’s region on an axis from 0.5 to 2.5, with a reference line at 1.',
    sens: 'A ratio above 1 means the capital’s region has a higher rate than its country. Each region is compared with its own country’s threshold.',
    bxl: 'Brussels: about twice the Belgian rate.',
    cap: 'Regional rate, national rate and ratio',
    cols: ['Region', 'Regional rate (%)', 'National rate (%)', 'Ratio'],
    legBxl: 'Brussels-Capital Region',
    legAutres: 'Other capitals’ regions',
    legRef: 'Ratio of 1 (same rate as the country)',
  },
  de: {
    titre: 'Armutsgefährdungsquote: Region der Hauptstadt im Verhältnis zu ihrem Land',
    indic: 'Verhältnis der Quote der Region der Hauptstadt zur Landesquote (Berechnung BGM)',
    resume: 'Ein Punkt je Region der Hauptstadt auf einer Achse von 0,5 bis 2,5, mit einer Bezugslinie bei 1.',
    sens: 'Über 1 hat die Region der Hauptstadt eine höhere Quote als ihr Land. Jede Region wird mit der Schwelle ihres eigenen Landes verglichen.',
    bxl: 'Brüssel: etwa das Doppelte der belgischen Quote.',
    cap: 'Regionale Quote, Landesquote und Verhältnis',
    cols: ['Region', 'Regionale Quote (%)', 'Landesquote (%)', 'Verhältnis'],
    legBxl: 'Region Brüssel-Hauptstadt',
    legAutres: 'Andere Regionen der Hauptstadt',
    legRef: 'Verhältnis von 1 (gleiche Quote wie das Land)',
  },
};

/** Nom localisé de NL32 (Hollande-Septentrionale), repris depuis EUROPE_RATIOS pour ne jamais diverger. */
const NOM_NL32: Record<Locale, string> = EUROPE_RATIOS.find((r) => r.geo === 'NL32')!.nom;

/**
 * Précision NUTS 2 : la « région de la capitale » est la région statistique qui contient la
 * capitale, pas nécessairement la capitale seule ni une entité à statut de région-capitale — aux
 * Pays-Bas notamment, il s'agit d'une province (Hollande-Septentrionale) qui contient Amsterdam.
 */
const NOTE_NUTS: Record<Locale, string> = {
  fr: `Pour chaque pays, la région statistique (NUTS 2) qui contient la capitale ; aux Pays-Bas, la province de ${NOM_NL32.fr}, qui contient Amsterdam.`,
  nl: `Voor elk land de statistische regio (NUTS 2) die de hoofdstad bevat; in Nederland de provincie ${NOM_NL32.nl}, waarin Amsterdam ligt.`,
  en: `For each country, the statistical region (NUTS 2) containing the capital; in the Netherlands, the province of ${NOM_NL32.en}, which contains Amsterdam.`,
  de: `Für jedes Land die statistische Region (NUTS 2), die die Hauptstadt enthält; in den Niederlanden die Provinz ${NOM_NL32.de}, die Amsterdam enthält.`,
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

/**
 * Point européen : rapport entre le taux de risque de pauvreté de chaque région de la capitale et
 * celui de son pays, un point par région autour d'une ligne de référence à 1. Aucun classement :
 * les points comme le tableau sont triés par ordre alphabétique du nom localisé, jamais par
 * rapport. Le texte fixe « environ deux fois » (Bruxelles) suppose un rapport BE10 entre 1,8 et
 * 2,2 — vérifié par un test (pas ici en exécution, pour ne jamais faire planter le rendu de page
 * si une donnée est rafraîchie) : voir points-europe.render.test.tsx.
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
          <p className="mt-1 text-xs text-neutral-600">{NOTE_NUTS[locale]}</p>
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
