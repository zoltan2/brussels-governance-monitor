// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { MoisAbonnes } from '@/lib/suivi-abonnes';

const LARGEUR = 280;
const HAUTEUR = 120;
const LIGNE_DE_BASE = 100;
const HAUTEUR_MAX = 76;
const LARGEUR_BARRE = 14;

const CLASSE_BARRE: Record<MoisAbonnes['statut'], string> = {
  mesure: 'fill-brand-700',
  reconstitue: 'fill-neutral-400',
  'en-cours': 'fill-none stroke-brand-700',
};

function dateDuMois(mois: string): Date {
  const [annee, m] = mois.split('-').map(Number);
  return new Date(Date.UTC(annee, m - 1, 15));
}

/** « juin » et « juil » : couper à trois lettres les confondrait. */
const MOIS_COURTS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc'];

function moisCourt(mois: string): string {
  return MOIS_COURTS[Number(mois.split('-')[1]) - 1];
}

function moisLong(mois: string): string {
  return new Intl.DateTimeFormat('fr-BE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateDuMois(mois));
}

const PRECISION: Record<MoisAbonnes['statut'], string> = {
  mesure: 'mesuré',
  reconstitue: 'reconstitué, abonnés encore présents uniquement',
  'en-cours': 'mois en cours',
};

/**
 * Nouveaux abonnés sur 12 mois. Le mois en cours est toujours à droite ; un
 * mois antérieur au premier contact connu reste vide, un mois à zéro garde sa
 * place. Le dessin est masqué aux lecteurs d'écran, qui lisent le tableau.
 */
export function NouveauxAbonnesChart({ mois }: { mois: MoisAbonnes[] }) {
  const pas = LARGEUR / mois.length;
  const max = Math.max(1, ...mois.map((m) => m.valeur ?? 0));

  return (
    <>
      <svg
        viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
        className="w-full"
        aria-hidden="true"
        data-testid="graphique-nouveaux-abonnes"
      >
        {mois.map((m, i) => {
          if (m.valeur === null) return null;
          const centre = pas * i + pas / 2;
          const hauteur = (m.valeur / max) * HAUTEUR_MAX;
          return (
            <g key={m.mois}>
              {m.valeur > 0 && (
                <rect
                  x={centre - LARGEUR_BARRE / 2}
                  y={LIGNE_DE_BASE - hauteur}
                  width={LARGEUR_BARRE}
                  height={hauteur}
                  rx={1.5}
                  strokeWidth={1.5}
                  strokeDasharray={m.statut === 'en-cours' ? '3 2' : undefined}
                  className={CLASSE_BARRE[m.statut]}
                />
              )}
              <text
                x={centre}
                y={LIGNE_DE_BASE - hauteur - 4}
                textAnchor="middle"
                className="fill-neutral-900 text-[11px] font-semibold"
              >
                {m.valeur}
              </text>
              <text
                x={centre}
                y={HAUTEUR - 5}
                textAnchor="middle"
                className="fill-neutral-600 text-[10px]"
              >
                {moisCourt(m.mois)}
              </text>
            </g>
          );
        })}
        <line
          x1={0}
          x2={LARGEUR}
          y1={LIGNE_DE_BASE}
          y2={LIGNE_DE_BASE}
          strokeWidth={1}
          className="stroke-neutral-300"
        />
      </svg>
      <table className="sr-only">
        <caption>Nouveaux abonnés par mois, sur les 12 derniers mois</caption>
        <thead>
          <tr>
            <th scope="col">Mois</th>
            <th scope="col">Nouveaux abonnés</th>
            <th scope="col">Précision</th>
          </tr>
        </thead>
        <tbody>
          {mois
            .filter((m) => m.valeur !== null)
            .map((m) => (
              <tr key={m.mois}>
                <th scope="row">{moisLong(m.mois)}</th>
                <td>{m.valeur}</td>
                <td>{PRECISION[m.statut]}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </>
  );
}
