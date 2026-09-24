// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ResponsibilityMatrix } from './responsibility-matrix';

afterEach(() => cleanup());
const props = {
  idBase: 'zru-matrice', caption: 'Qui tient quoi', themeColLabel: 'Thème', emptyCellLabel: 'Aucun rôle',
  levels: [{ key: 'R', label: 'Régional' }, { key: 'C', label: 'Communal' }],
  rows: [{ id: 'mesure', label: 'Mesurer', cells: { R: 'IBSA', C: null } }],
};

describe('ResponsibilityMatrix', () => {
  it('rend la légende avec un id dérivé de idBase', () => {
    const { container } = render(<ResponsibilityMatrix {...props} />);
    expect(container.querySelector('#zru-matrice-caption')?.textContent).toBe('Qui tient quoi');
  });
  it('rend les cellules et signale les cases vides', () => {
    const { container } = render(<ResponsibilityMatrix {...props} />);
    expect(container.textContent).toContain('IBSA');
    expect(container.querySelectorAll('[aria-label="Aucun rôle"]').length).toBeGreaterThan(0);
  });
  it('deux matrices sur une page ont des identifiants distincts', () => {
    const { container } = render(<><ResponsibilityMatrix {...props} /><ResponsibilityMatrix {...props} idBase="autre" /></>);
    expect(container.querySelectorAll('#zru-matrice-caption')).toHaveLength(1);
  });
});
