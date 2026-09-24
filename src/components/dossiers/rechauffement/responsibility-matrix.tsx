// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactElement } from 'react';
import { ResponsibilityMatrix } from '../responsibility-matrix';
import {
  COMPETENCES,
  POWER_LEVEL_KEYS,
  POWER_LEVEL_LABELS,
  MATRIX_CAPTION,
  THEME_COL_LABEL,
  EMPTY_CELL_LABEL,
  type Locale,
} from './data/competences';

export function RechauffementResponsibilityMatrix({
  locale = 'fr',
}: {
  locale?: Locale;
}): ReactElement {
  const levels = POWER_LEVEL_LABELS[locale] ?? POWER_LEVEL_LABELS.fr;

  return (
    <ResponsibilityMatrix
      idBase="rechauffement-responsibility-matrix"
      caption={MATRIX_CAPTION[locale] ?? MATRIX_CAPTION.fr}
      themeColLabel={THEME_COL_LABEL[locale] ?? THEME_COL_LABEL.fr}
      emptyCellLabel={EMPTY_CELL_LABEL[locale] ?? EMPTY_CELL_LABEL.fr}
      levels={POWER_LEVEL_KEYS.map((k) => ({ key: k, label: levels[k] }))}
      rows={COMPETENCES.map((t) => ({
        id: t.id,
        label: t.label[locale] ?? t.label.fr,
        cells: Object.fromEntries(
          POWER_LEVEL_KEYS.map((k) => [k, t.cells[k][locale] ?? t.cells[k].fr ?? null]),
        ),
      }))}
    />
  );
}
