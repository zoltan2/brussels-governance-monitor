// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactElement } from 'react';
import { COMPETENCES, POWER_LEVELS } from './data/competences';

const CAPTION_ID = 'rechauffement-responsibility-matrix-caption';

/** Cellule vide : affichage neutre avec indication d'accessibilite */
function EmptyCell(): ReactElement {
  return (
    <span
      aria-label="Non competent"
      className="text-neutral-300"
    >
      -
    </span>
  );
}

export function RechauffementResponsibilityMatrix(): ReactElement {
  return (
    <figure
      aria-labelledby={CAPTION_ID}
      className="my-8 overflow-hidden rounded-lg border border-neutral-200 bg-white"
    >
      <figcaption
        id={CAPTION_ID}
        className="border-b border-neutral-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
      >
        Matrice de responsabilite : 5 niveaux de pouvoir par theme climatique a Bruxelles
      </figcaption>

      {/* Mobile : cartes empilees par theme */}
      <ul className="divide-y divide-neutral-200 sm:hidden">
        {COMPETENCES.map((theme) => (
          <li key={theme.id} className="px-4 py-3">
            <div className="mb-2 text-sm font-semibold text-neutral-900">{theme.label}</div>
            <dl className="space-y-1">
              {POWER_LEVELS.map((level) => {
                const cell = theme.cells[level];
                return (
                  <div key={level} className="flex gap-2 text-xs">
                    <dt className="w-28 shrink-0 font-medium text-neutral-500">{level}</dt>
                    <dd className="text-neutral-700">
                      {cell ? cell : <span className="text-neutral-300" aria-label="Non competent">-</span>}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </li>
        ))}
      </ul>

      {/* Desktop : tableau complet */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th scope="col" className="px-4 py-2.5">
                Theme
              </th>
              {POWER_LEVELS.map((level) => (
                <th key={level} scope="col" className="px-4 py-2.5">
                  {level}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPETENCES.map((theme) => (
              <tr
                key={theme.id}
                className="border-t border-neutral-100 align-top"
              >
                <th
                  scope="row"
                  className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-700 whitespace-nowrap"
                >
                  {theme.label}
                </th>
                {POWER_LEVELS.map((level) => {
                  const cell = theme.cells[level];
                  return (
                    <td key={level} className="px-4 py-2.5 text-xs text-neutral-600">
                      {cell ? cell : <EmptyCell />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
