// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactElement } from 'react';
import { ResponsibilityMatrix } from '../responsibility-matrix';
import { NIVEAUX, LIGNES, CAPTION, COL_THEME, CASE_VIDE } from './data/competences';
import type { Locale } from './data/types';

/** Matrice « qui tient quoi » du dossier ZRU, rendue par la matrice de responsabilité générique. Composant serveur. */
export function ZruMatrice({ locale = 'fr' }: { locale?: Locale }): ReactElement {
  return (
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
  );
}
