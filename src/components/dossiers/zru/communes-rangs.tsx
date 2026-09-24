// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactElement } from 'react';
import { LegendeSource, formaterNombre } from './figure-zru';
import { COMMUNES_TAUX, PROVENANCE_COMMUNES } from './data/communes';
import type { Locale } from './data/types';
import type { CelluleStatbel } from '@/lib/zru/statbel';

const T: Record<
  Locale,
  {
    titre: string;
    indic: string;
    rupture: string;
    direction: string;
    nd: string;
    prudence: string;
    rangSur: (rang: number, n: number) => string;
    commune: string;
    periode: (a: string, b: string) => string;
  }
> = {
  fr: {
    titre: 'Taux de pauvreté administratif des 19 communes : rangs par période',
    indic:
      'Taux de pauvreté administratif (Statbel), rang parmi les communes bruxelloises (calcul BGM)',
    rupture:
      "Rupture de série en 2020 : Statbel a amélioré sa méthodologie, et les chiffres jusqu'à 2019 ne sont comparables à ceux de 2020 et suivants que dans une certaine mesure. Les rangs sont donc donnés par période.",
    direction: 'Rang 1 : taux le plus élevé.',
    nd: 'non disponible',
    prudence: 'à lire avec prudence',
    rangSur: (rang, n) => `rang ${rang} sur ${n}`,
    commune: 'Commune',
    periode: (a, b) => `De ${a} à ${b}`,
  },
  nl: {
    titre: 'Administratieve armoedegraad van de 19 gemeenten: rang per periode',
    indic:
      'Administratieve armoedegraad (Statbel), rang onder de Brusselse gemeenten (berekening BGM)',
    rupture:
      'Breuk in de reeks in 2020: Statbel heeft zijn methodologie verbeterd, en de cijfers tot en met 2019 zijn slechts in zekere mate vergelijkbaar met die van 2020 en later. De rangen worden daarom per periode gegeven.',
    direction: 'Rang 1: hoogste percentage.',
    nd: 'niet beschikbaar',
    prudence: 'met voorzichtigheid te lezen',
    rangSur: (rang, n) => `rang ${rang} op ${n}`,
    commune: 'Gemeente',
    periode: (a, b) => `Van ${a} tot ${b}`,
  },
  en: {
    titre: 'Administrative poverty rate of the 19 municipalities: ranks by period',
    indic:
      'Administrative poverty rate (Statbel), rank among Brussels municipalities (BGM calculation)',
    rupture:
      'Series break in 2020: Statbel improved its methodology, and figures up to 2019 are only comparable to some extent with those from 2020 onwards. Ranks are therefore given by period.',
    direction: 'Rank 1: highest rate.',
    nd: 'not available',
    prudence: 'to be read with caution',
    rangSur: (rang, n) => `rank ${rang} of ${n}`,
    commune: 'Municipality',
    periode: (a, b) => `From ${a} to ${b}`,
  },
  de: {
    titre: 'Administrative Armutsquote der 19 Gemeinden: Rang je Zeitraum',
    indic:
      'Administrative Armutsquote (Statbel), Rang unter den Brüsseler Gemeinden (Berechnung BGM)',
    rupture:
      'Reihenbruch 2020: Statbel hat seine Methodik verbessert, die Zahlen bis einschließlich 2019 sind mit denen ab 2020 nur bedingt vergleichbar. Die Ränge werden daher je Zeitraum angegeben.',
    direction: 'Rang 1: höchste Quote.',
    nd: 'nicht verfügbar',
    prudence: 'mit Vorsicht zu lesen',
    rangSur: (rang, n) => `Rang ${rang} von ${n}`,
    commune: 'Gemeinde',
    periode: (a, b) => `Von ${a} bis ${b}`,
  },
};

/** Périodes affichées, séparées par la rupture de série de 2020 : [clé, début, fin]. */
const PERIODES: [string, string, string][] = [
  ['2015-2019', '2015', '2019'],
  ['2020-2023', '2020', '2023'],
];

/**
 * Rang de compétition standard (1, 2, 2, 4…) sur une année : rang 1 = taux le plus élevé.
 * Les communes sans valeur cette année-là (Ixelles avant 2020) sont exclues du classement et
 * du calcul de N. Fonction pure, exportée pour être testée directement (égalités, N).
 */
export function calculerRangs(
  valeurs: { niscode: string; valeur: number | null }[],
): Map<string, number> {
  const disponibles = valeurs.filter(
    (v): v is { niscode: string; valeur: number } => v.valeur !== null,
  );
  const tries = [...disponibles].sort((a, b) => b.valeur - a.valeur);
  const rangs = new Map<string, number>();
  let rangCourant = 0;
  let derniereValeur: number | null = null;
  tries.forEach((c, i) => {
    if (derniereValeur === null || c.valeur !== derniereValeur) {
      rangCourant = i + 1;
      derniereValeur = c.valeur;
    }
    rangs.set(c.niscode, rangCourant);
  });
  return rangs;
}

/** Rangs et effectif (N = nombre de communes avec une valeur) pour une année donnée. */
function rangsAnnee(annee: string): { rangs: Map<string, number>; n: number } {
  const valeurs = COMMUNES_TAUX.map((c) => ({
    niscode: c.niscode,
    valeur: c.serie[annee]?.valeur ?? null,
  }));
  return { rangs: calculerRangs(valeurs), n: valeurs.filter((v) => v.valeur !== null).length };
}

export function ZruCommunesRangs({ locale = 'fr' }: { locale?: Locale }): ReactElement {
  const t = T[locale];
  const idBase = 'zru-communes-rangs';
  const idTitre = `${idBase}-titre`;
  // Espace insécable avant % en français, néerlandais et allemand ; aucune espace en anglais.
  const pourcent = locale === 'en' ? '%' : '\u00a0%';

  const cellule = (c: CelluleStatbel | undefined, rang: number | undefined, n: number): string => {
    if (!c || c.valeur === null || rang === undefined) return t.nd;
    const pct = Math.round(c.valeur * 10) / 10;
    return `${t.rangSur(rang, n)} (${formaterNombre(pct, locale)}${pourcent})${c.statut === 'prudence' ? `, ${t.prudence}` : ''}`;
  };

  return (
    <figure
      aria-labelledby={idTitre}
      className="my-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4"
    >
      <p id={idTitre} className="text-sm font-semibold text-neutral-900">
        {t.titre}
      </p>
      <p className="mt-1 text-xs text-neutral-700">{t.rupture}</p>
      <p className="mt-1 text-xs text-neutral-700">{t.direction}</p>

      {PERIODES.map(([cle, debut, fin]) => {
        const { rangs: rangsDebut, n: nDebut } = rangsAnnee(debut);
        const { rangs: rangsFin, n: nFin } = rangsAnnee(fin);
        return (
          <div
            key={cle}
            role="region"
            // Nom du repère préfixé par le titre de la figure : « De 2015 à 2019 » seul serait
            // ambigu dans la liste des repères d'un lecteur d'écran.
            aria-label={`${t.titre}, ${t.periode(debut, fin).toLowerCase()}`}
            tabIndex={0}
            className="mt-3 overflow-x-auto"
          >
            <table data-periode={cle} className="w-full text-xs">
              <caption className="text-left font-medium text-neutral-800">
                {t.periode(debut, fin)}
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="px-2 py-1 text-left">
                    {t.commune}
                  </th>
                  <th scope="col" className="px-2 py-1 text-left">
                    {debut}
                  </th>
                  <th scope="col" className="px-2 py-1 text-left">
                    {fin}
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMMUNES_TAUX.map((c) => (
                  <tr
                    key={c.niscode}
                    data-niscode={c.niscode}
                    className="border-t border-neutral-200"
                  >
                    <th scope="row" className="px-2 py-1 text-left font-normal">
                      {locale === 'nl' ? c.nom.nl : c.nom.fr}
                    </th>
                    <td data-annee={debut} className="px-2 py-1">
                      {cellule(c.serie[debut], rangsDebut.get(c.niscode), nDebut)}
                    </td>
                    <td data-annee={fin} className="px-2 py-1">
                      {cellule(c.serie[fin], rangsFin.get(c.niscode), nFin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <LegendeSource
        locale={locale}
        indicateur={t.indic}
        periode="2015-2023"
        provenance={PROVENANCE_COMMUNES}
      />
    </figure>
  );
}
