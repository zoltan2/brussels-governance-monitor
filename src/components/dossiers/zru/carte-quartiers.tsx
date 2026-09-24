// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
import type { ReactElement } from 'react';
import { FigureZru, formaterNombre } from './figure-zru';
import { QUARTIERS, ZRU_2026, VIEWBOX } from './data/geometrie';
import {
  QUARTIERS_VALEURS,
  SEUILS_PALIERS,
  INDICATEUR_QUARTIERS,
  ANNEE_QUARTIERS,
  PROVENANCE_QUARTIERS,
} from './data/quartiers';
import type { Locale } from './data/types';

type Palier = {
  titre: string;
  resume: string;
  cap: string;
  cols: [string, string, string];
  sans: string;
  palier: (n: number) => string;
  zru: string;
  direction: string;
  moinsDe: (borne: string) => string;
  etPlus: (borne: string) => string;
  deA: (basse: string, haute: string) => string;
};

const T: Record<Locale, Palier> = {
  fr: {
    titre: 'Revenu par quartier et ZRU 2026',
    resume:
      "Les 145 quartiers colorés en cinq paliers de revenu médian après impôt, les quartiers sans donnée (non habités) hachurés, et le contour de la ZRU 2026.",
    cap: 'Valeur et palier de chaque quartier',
    cols: ['Quartier', 'Valeur (€)', 'Palier'],
    sans: 'sans donnée',
    palier: (n) => `palier ${n} sur 5`,
    zru: 'Contour\u00a0: ZRU 2026',
    direction: 'Paliers du revenu le plus bas (1) au plus élevé (5).',
    moinsDe: (b) => `moins de ${b}`,
    etPlus: (b) => `${b} et plus`,
    deA: (a, b) => `de ${a} à ${b}`,
  },
  nl: {
    titre: 'Inkomen per wijk en ZSH 2026',
    resume:
      'De 145 wijken in vijf klassen naar mediaan inkomen na belasting, wijken zonder gegevens (onbewoond) gearceerd, en de grens van de ZSH 2026.',
    cap: 'Waarde en klasse van elke wijk',
    cols: ['Wijk', 'Waarde (€)', 'Klasse'],
    sans: 'geen gegevens',
    palier: (n) => `klasse ${n} van 5`,
    zru: 'Grens: ZSH 2026',
    direction: 'Klassen van het laagste (1) tot het hoogste inkomen (5).',
    moinsDe: (b) => `minder dan ${b}`,
    etPlus: (b) => `${b} en meer`,
    deA: (a, b) => `van ${a} tot ${b}`,
  },
  en: {
    titre: 'Income by neighbourhood and the 2026 zone',
    resume:
      'The 145 neighbourhoods in five bands of median income after tax, neighbourhoods with no data (uninhabited) hatched, and the outline of the 2026 zone.',
    cap: 'Value and band of each neighbourhood',
    cols: ['Neighbourhood', 'Value (€)', 'Band'],
    sans: 'no data',
    palier: (n) => `band ${n} of 5`,
    zru: 'Outline: 2026 zone',
    direction: 'Bands from lowest (1) to highest (5) income.',
    moinsDe: (b) => `under ${b}`,
    etPlus: (b) => `${b} and over`,
    deA: (a, b) => `${a} to ${b}`,
  },
  de: {
    titre: 'Einkommen je Viertel und Zone 2026',
    resume:
      'Die 145 Viertel in fünf Stufen nach medianem Einkommen nach Steuern, Viertel ohne Daten (unbewohnt) schraffiert, und die Grenze der Zone 2026.',
    cap: 'Wert und Stufe jedes Viertels',
    cols: ['Viertel', 'Wert (€)', 'Stufe'],
    sans: 'keine Daten',
    palier: (n) => `Stufe ${n} von 5`,
    zru: 'Umriss: Zone 2026',
    direction: 'Stufen vom niedrigsten (1) bis zum höchsten (5) Einkommen.',
    moinsDe: (b) => `unter ${b}`,
    etPlus: (b) => `${b} und mehr`,
    deA: (a, b) => `${a} bis ${b}`,
  },
};

/**
 * Millésime affiché en légende, par langue : l'indicateur 2498 du Monitoring des Quartiers
 * publie une statistique fiscale par ANNÉE DE REVENUS (vérifié le 24/09/2026, Tâche 17 ;
 * Statbel a publié les revenus 2023 le 19/11/2025), pas une année de publication. Le dire
 * explicitement évite de laisser croire à un revenu 2023 constaté en 2023.
 */
const PERIODE_QUARTIERS: Record<Locale, string> = {
  fr: `revenus ${ANNEE_QUARTIERS}`,
  nl: `inkomens ${ANNEE_QUARTIERS}`,
  en: `${ANNEE_QUARTIERS} income`,
  de: `Einkommen ${ANNEE_QUARTIERS}`,
};

/**
 * Classes de remplissage des cinq paliers, écrites en toutes lettres : Tailwind v4 ne génère que
 * les classes qu'il lit littéralement dans le code source, jamais une classe assemblée à
 * l'exécution (`fill-choro-${n}` rendait la carte noire en production). Voir
 * classes-tailwind-litterales.test.ts.
 */
const FILL = {
  1: 'fill-choro-1',
  2: 'fill-choro-2',
  3: 'fill-choro-3',
  4: 'fill-choro-4',
  5: 'fill-choro-5',
} as const;

export function ZruCarteQuartiers({ locale = 'fr' }: { locale?: Locale }): ReactElement {
  const t = T[locale];
  const idBase = 'zru-carte-quartiers';
  const idMotifSansDonnee = `${idBase}-sans-donnee`;
  const parId = new Map(QUARTIERS_VALEURS.map((q) => [q.mdId, q]));
  const nomLocal = (q: (typeof QUARTIERS_VALEURS)[number]) => (locale === 'nl' ? q.nom.nl : q.nom.fr);

  // Bornes des cinq paliers : [null, s1, s2, s3, s4, null], bornes[n-1] = borne basse
  // du palier n, bornes[n] = borne haute. Palier 1 = revenu le plus bas (SEUILS_PALIERS croissant).
  const bornes: (number | null)[] = [null, ...SEUILS_PALIERS, null];
  // Euro entier : formaterNombre garde ses décimales par défaut pour les autres appelants
  // (surfaces en km²…), donc l'arrondi se fait ici, avant formatage.
  const avecUnite = (n: number) => `${formaterNombre(Math.round(n), locale)}\u00a0€`;
  const texteBornes = (n: number): string => {
    const basse = bornes[n - 1];
    const haute = bornes[n];
    if (basse === null) return t.moinsDe(avecUnite(haute as number));
    if (haute === null) return t.etPlus(avecUnite(basse));
    return t.deA(avecUnite(basse), avecUnite(haute));
  };

  return (
    <FigureZru
      idBase={idBase}
      locale={locale}
      titre={t.titre}
      indicateur={INDICATEUR_QUARTIERS[locale]}
      periode={PERIODE_QUARTIERS[locale]}
      provenance={PROVENANCE_QUARTIERS}
      resumeSvg={t.resume}
      svg={
        <svg viewBox={VIEWBOX}>
          <defs>
            {/* Fond explicite (neutral-100) + trait neutral-600 : ≥ 3:1 (SC 1.4.11) contre le
                fond du motif et contre le palier 1 (choro-1), en clair comme en sombre — voir
                globals.contrast.test.ts, describe 'ZRU : motif « sans donnée »'. */}
            <pattern id={idMotifSansDonnee} width="5" height="5" patternUnits="userSpaceOnUse">
              <rect width="5" height="5" className="fill-neutral-100" />
              <path d="M0 5L5 0" className="stroke-neutral-600" strokeWidth="1" />
            </pattern>
          </defs>
          {QUARTIERS.map((g) => {
            const v = parId.get(g.mdId);
            return v?.palier ? (
              <path key={g.mdId} data-md-id={g.mdId} d={g.d} className={`${FILL[v.palier]} stroke-neutral-50`} strokeWidth="0.5" />
            ) : (
              <path
                key={g.mdId}
                data-md-id={g.mdId}
                d={g.d}
                fill={`url(#${idMotifSansDonnee})`}
                className="stroke-neutral-300"
                strokeWidth="0.5"
              />
            );
          })}
          <path d={ZRU_2026} fill="none" fillRule="evenodd" className="stroke-neutral-50" strokeWidth="4" />
          <path d={ZRU_2026} fill="none" fillRule="evenodd" className="stroke-status-delayed" strokeWidth="2" strokeDasharray="2 2" />
        </svg>
      }
      legende={
        <div className="mt-3">
          <p className="text-xs text-neutral-600">{t.direction}</p>
          <ul data-legende className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-600">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <li key={n} className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
                  <rect width="12" height="12" className={FILL[n]} />
                </svg>
                <span>
                  {t.palier(n)}
                  {locale === 'fr' ? '\u00a0: ' : ': '}
                  {texteBornes(n)}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
                <rect width="12" height="12" fill={`url(#${idMotifSansDonnee})`} className="stroke-neutral-400" />
              </svg>
              <span>{t.sans}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
                <line x1="1" y1="6" x2="11" y2="6" className="stroke-status-delayed" strokeWidth="1.5" strokeDasharray="2 2" />
              </svg>
              <span>{t.zru}</span>
            </li>
          </ul>
        </div>
      }
      tableau={{
        caption: t.cap,
        colonnes: t.cols,
        lignes: [...QUARTIERS_VALEURS]
          .sort((a, b) => nomLocal(a).localeCompare(nomLocal(b), locale))
          .map((q) => [
            nomLocal(q),
            q.valeur === null ? t.sans : Math.round(q.valeur),
            q.palier ? t.palier(q.palier) : t.sans,
          ]),
      }}
    />
  );
}
