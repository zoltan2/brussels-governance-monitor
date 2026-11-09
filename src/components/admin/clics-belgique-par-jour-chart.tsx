// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { JourClics } from '@/lib/seo-report';

const LARGEUR = 560;
const HAUTEUR = 140;
const LIGNE_DE_BASE = 112;
const HAUTEUR_MAX = 92;

/** « 7 nov. » : jour et mois courts, sans fuseau (une date Search Console
 * est un jour calendaire en heure du Pacifique, pas un instant). */
function jourCourt(date: string): string {
  const [annee, mois, jour] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-BE', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(annee, mois - 1, jour)));
}

/**
 * Clics depuis la Belgique, jour par jour, sur les deux fenêtres que compare
 * le rapport : les 28 jours précédents en gris, les 28 derniers en bleu
 * foncé, séparés par un trait. Répond à « la baisse est-elle un pic qui
 * retombe ou une pente ? », ce qu'un total sur 28 jours ne dit pas.
 *
 * Un jour absent de la liste (aucune donnée transmise) reste un trou, jamais
 * une barre à zéro. Le sens d'une variation n'est porté par aucune couleur
 * (ni rouge ni vert sur ce site). Le dessin est masqué aux lecteurs d'écran,
 * qui lisent le tableau.
 */
export function ClicsBelgiqueParJourChart({
  courants,
  precedents,
}: {
  courants: JourClics[];
  precedents: JourClics[];
}) {
  const jours = [
    ...precedents.map((j) => ({ ...j, fenetre: 'precedente' as const })),
    ...courants.map((j) => ({ ...j, fenetre: 'courante' as const })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  if (jours.length === 0) return null;

  const pas = LARGEUR / jours.length;
  const largeurBarre = Math.max(2, pas * 0.7);
  const max = Math.max(1, ...jours.map((j) => j.clics ?? 0));
  const indexBascule = jours.findIndex((j) => j.fenetre === 'courante');
  const premier = jours[0];
  const dernier = jours[jours.length - 1];

  return (
    <figure className="mt-2">
      <svg
        viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
        className="w-full"
        aria-hidden="true"
        data-testid="graphique-clics-belgique-par-jour"
      >
        {jours.map((j, i) => {
          if (j.clics === null) return null;
          const hauteur = (j.clics / max) * HAUTEUR_MAX;
          return (
            <rect
              key={j.date}
              x={pas * i + (pas - largeurBarre) / 2}
              y={LIGNE_DE_BASE - hauteur}
              width={largeurBarre}
              height={Math.max(hauteur, j.clics > 0 ? 1 : 0)}
              rx={1}
              className={j.fenetre === 'courante' ? 'fill-brand-700' : 'fill-neutral-300'}
            />
          );
        })}
        {indexBascule > 0 && (
          <line
            x1={pas * indexBascule}
            x2={pas * indexBascule}
            y1={8}
            y2={LIGNE_DE_BASE}
            strokeWidth={1}
            strokeDasharray="3 3"
            className="stroke-neutral-500"
          />
        )}
        <line
          x1={0}
          x2={LARGEUR}
          y1={LIGNE_DE_BASE}
          y2={LIGNE_DE_BASE}
          strokeWidth={1}
          className="stroke-neutral-300"
        />
        <text x={2} y={10} className="fill-neutral-600 text-[10px]">
          max. {max.toLocaleString('fr-BE')} clics par jour
        </text>
        <text x={0} y={HAUTEUR - 6} className="fill-neutral-600 text-[10px]">
          {jourCourt(premier.date)}
        </text>
        {indexBascule > 0 && (
          <text
            x={pas * indexBascule}
            y={HAUTEUR - 6}
            textAnchor="middle"
            className="fill-neutral-600 text-[10px]"
          >
            {jourCourt(jours[indexBascule].date)}
          </text>
        )}
        <text x={LARGEUR} y={HAUTEUR - 6} textAnchor="end" className="fill-neutral-600 text-[10px]">
          {jourCourt(dernier.date)}
        </text>
      </svg>
      <figcaption className="mt-1 text-xs text-neutral-600">
        Clics depuis la Belgique, jour par jour : en gris les 28 jours précédents, en bleu foncé les
        28 derniers jours de données.
      </figcaption>
      <table className="sr-only">
        <caption>Clics depuis la Belgique, jour par jour, sur les deux fenêtres comparées</caption>
        <thead>
          <tr>
            <th scope="col">Jour</th>
            <th scope="col">Clics</th>
            <th scope="col">Fenêtre</th>
          </tr>
        </thead>
        <tbody>
          {jours.map((j) => (
            <tr key={j.date}>
              <td>{j.date}</td>
              <td>{j.clics === null ? 'indisponible' : j.clics.toLocaleString('fr-BE')}</td>
              <td>{j.fenetre === 'courante' ? '28 derniers jours' : '28 jours précédents'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
