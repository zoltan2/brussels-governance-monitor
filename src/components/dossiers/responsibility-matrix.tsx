// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactElement } from 'react';

/**
 * Cellule vide : affichage neutre avec indication d'accessibilite. Le role="img" rend
 * l'aria-label valide (un aria-label sur un span generique n'est pas un nom accessible).
 */
function EmptyCell({ ariaLabel }: { ariaLabel: string }): ReactElement {
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className="text-neutral-300"
    >
      -
    </span>
  );
}

export type ResponsibilityMatrixLevel = {
  /** Cle interne du niveau de pouvoir, utilisee comme cle de `rows[].cells` */
  key: string;
  /** Libelle affiche en en-tete de colonne */
  label: string;
};

export type ResponsibilityMatrixRow = {
  /** Identifiant court de la ligne (theme/competence) */
  id: string;
  /** Libelle affiche de la ligne */
  label: string;
  /** Contenu par niveau de pouvoir ; null ou absent = non competent */
  cells: Record<string, string | null>;
};

export type ResponsibilityMatrixProps = {
  /** Prefixe des identifiants DOM, pour distinguer plusieurs matrices sur une meme page */
  idBase: string;
  /** Legende de la matrice */
  caption: string;
  /** Libelle de la premiere colonne (theme/competence) */
  themeColLabel: string;
  /** Libelle aria affiche sur les cellules vides */
  emptyCellLabel: string;
  /** Niveaux de pouvoir, en colonnes */
  levels: ResponsibilityMatrixLevel[];
  /** Themes/competences, en lignes */
  rows: ResponsibilityMatrixRow[];
  /**
   * Sans marge verticale propre (my-8) : pour une matrice placee dans un bloc qui porte deja la
   * marge et un pied (ligne des sources). Absent = rendu inchange.
   */
  sansMarge?: boolean;
};

/**
 * Matrice de responsabilite generique : qui (niveau de pouvoir) fait quoi (theme/competence).
 * Composant serveur uniquement (pas de hook, pas de gestionnaire d'evenement).
 */
export function ResponsibilityMatrix({
  idBase,
  caption,
  themeColLabel,
  emptyCellLabel,
  levels,
  rows,
  sansMarge = false,
}: ResponsibilityMatrixProps): ReactElement {
  const captionId = `${idBase}-caption`;

  return (
    <figure
      aria-labelledby={captionId}
      className={
        sansMarge
          ? 'overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50'
          : 'my-8 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50'
      }
    >
      <figcaption
        id={captionId}
        className="border-b border-neutral-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
      >
        {caption}
      </figcaption>

      {/* Mobile : cartes empilees par theme */}
      <ul className="divide-y divide-neutral-200 sm:hidden">
        {rows.map((row) => (
          <li key={row.id} className="px-4 py-3">
            <div className="mb-2 text-sm font-semibold text-neutral-900">
              {row.label}
            </div>
            <dl className="space-y-1">
              {levels.map((level) => {
                const cell = row.cells[level.key];
                return (
                  <div key={level.key} className="flex gap-2 text-xs">
                    <dt className="w-28 shrink-0 font-medium text-neutral-500">{level.label}</dt>
                    <dd className="text-neutral-700">
                      {cell ? cell : <EmptyCell ariaLabel={emptyCellLabel} />}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </li>
        ))}
      </ul>

      {/* Desktop : tableau complet */}
      <div
        role="region"
        tabIndex={0}
        aria-labelledby={captionId}
        className="hidden overflow-x-auto sm:block"
      >
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th scope="col" className="px-4 py-2.5">
                {themeColLabel}
              </th>
              {levels.map((level) => (
                <th key={level.key} scope="col" className="px-4 py-2.5">
                  {level.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-neutral-100 align-top"
              >
                <th
                  scope="row"
                  className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-700 whitespace-nowrap"
                >
                  {row.label}
                </th>
                {levels.map((level) => {
                  const cell = row.cells[level.key];
                  return (
                    <td key={level.key} className="px-4 py-2.5 text-xs text-neutral-600">
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
