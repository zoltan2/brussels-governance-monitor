// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactElement } from 'react';
import {
  COMPETENCES,
  POWER_LEVEL_KEYS,
  POWER_LEVEL_LABELS,
  MATRIX_CAPTION,
  THEME_COL_LABEL,
  EMPTY_CELL_LABEL,
  type Locale,
} from './data/competences';

const CAPTION_ID = 'rechauffement-responsibility-matrix-caption';

/** Cellule vide : affichage neutre avec indication d'accessibilite */
function EmptyCell({ ariaLabel }: { ariaLabel: string }): ReactElement {
  return (
    <span
      aria-label={ariaLabel}
      className="text-neutral-300"
    >
      -
    </span>
  );
}

export function RechauffementResponsibilityMatrix({
  locale = 'fr',
}: {
  locale?: Locale;
}): ReactElement {
  const levels = POWER_LEVEL_LABELS[locale] ?? POWER_LEVEL_LABELS.fr;
  const caption = MATRIX_CAPTION[locale] ?? MATRIX_CAPTION.fr;
  const themeColLabel = THEME_COL_LABEL[locale] ?? THEME_COL_LABEL.fr;
  const emptyCellLabel = EMPTY_CELL_LABEL[locale] ?? EMPTY_CELL_LABEL.fr;

  return (
    <figure
      aria-labelledby={CAPTION_ID}
      className="my-8 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
    >
      <figcaption
        id={CAPTION_ID}
        className="border-b border-neutral-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
      >
        {caption}
      </figcaption>

      {/* Mobile : cartes empilees par theme */}
      <ul className="divide-y divide-neutral-200 sm:hidden">
        {COMPETENCES.map((theme) => (
          <li key={theme.id} className="px-4 py-3">
            <div className="mb-2 text-sm font-semibold text-neutral-900">
              {theme.label[locale] ?? theme.label.fr}
            </div>
            <dl className="space-y-1">
              {POWER_LEVEL_KEYS.map((key) => {
                const cell = theme.cells[key][locale] ?? theme.cells[key].fr;
                return (
                  <div key={key} className="flex gap-2 text-xs">
                    <dt className="w-28 shrink-0 font-medium text-neutral-500">{levels[key]}</dt>
                    <dd className="text-neutral-700">
                      {cell ? cell : (
                        <span className="text-neutral-300" aria-label={emptyCellLabel}>-</span>
                      )}
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
                {themeColLabel}
              </th>
              {POWER_LEVEL_KEYS.map((key) => (
                <th key={key} scope="col" className="px-4 py-2.5">
                  {levels[key]}
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
                  {theme.label[locale] ?? theme.label.fr}
                </th>
                {POWER_LEVEL_KEYS.map((key) => {
                  const cell = theme.cells[key][locale] ?? theme.cells[key].fr;
                  return (
                    <td key={key} className="px-4 py-2.5 text-xs text-neutral-600">
                      {cell ? cell : <EmptyCell ariaLabel={emptyCellLabel} />}
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
