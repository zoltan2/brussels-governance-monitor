// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactElement } from 'react';
import { ResponsibilityMatrix } from '../responsibility-matrix';
import {
  NIVEAUX,
  LIGNES,
  CAPTION,
  COL_THEME,
  CASE_VIDE,
  LIBELLE_SOURCES,
  SOURCES_MATRICE,
  sourcesCitees,
} from './data/competences';
import type { Locale } from './data/types';

/**
 * Matrice « qui tient quoi » du dossier ZRU, rendue par la matrice de responsabilité
 * générique, suivie de la ligne des sources (une par source citée, liens comme LegendeSource).
 * Composant serveur.
 */
export function ZruMatrice({ locale = 'fr' }: { locale?: Locale }): ReactElement {
  const cles = sourcesCitees();
  return (
    <div className="my-8">
      <ResponsibilityMatrix
        idBase="zru-matrice"
        caption={CAPTION[locale]}
        themeColLabel={COL_THEME[locale]}
        emptyCellLabel={CASE_VIDE[locale]}
        levels={NIVEAUX.map((n) => ({ key: n.cle, label: n.libelle[locale] }))}
        rows={LIGNES.map((l) => ({
          id: l.id,
          label: l.libelle[locale],
          cells: Object.fromEntries(NIVEAUX.map((n) => [n.cle, l.cases[n.cle]?.[locale] ?? null])),
        }))}
      />
      <p className="-mt-6 text-xs leading-relaxed text-neutral-600">
        {LIBELLE_SOURCES[locale]}{' '}
        {cles.map((cle, i) => (
          <span key={cle}>
            {i > 0 && (locale === 'fr' ? '\u00a0; ' : '; ')}
            <a
              href={SOURCES_MATRICE[cle].url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 underline underline-offset-2 [overflow-wrap:anywhere] hover:text-brand-900"
            >
              {SOURCES_MATRICE[cle].libelle[locale]}
            </a>
          </span>
        ))}
        .
      </p>
    </div>
  );
}
