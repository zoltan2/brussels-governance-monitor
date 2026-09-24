// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CollapsibleMetrics } from './collapsible-metrics';

afterEach(() => cleanup());

describe('CollapsibleMetrics', () => {
  // Revue PR #602 : l'espace entre la valeur et l'unité doit être une espace
  // insécable (U+00A0), convention du dépôt (voir dossier-alert.tsx,
  // carte-quartiers.tsx), pour que la valeur et son unité ne se séparent
  // jamais à la ligne — seul un mot individuellement trop long doit pouvoir
  // se couper (break-words), jamais la paire valeur+unité elle-même.
  it('sépare la valeur et l\'unité par une espace insécable (U+00A0), pas une espace normale', () => {
    const { container } = render(
      <CollapsibleMetrics
        metrics={[{ label: 'Écart annuel', value: '+477', unit: '%' }]}
        locale="fr"
      />,
    );
    const value = container.querySelector('p.text-2xl');
    expect(value).not.toBeNull();
    const text = value!.textContent ?? '';
    expect(text).toBe('+477 %');
    expect(text).not.toContain('+477 %'); // espace normale (U+0020) : absente
  });

  it('un libellé sans unité ne laisse pas traîner d\'espace insécable', () => {
    const { container } = render(
      <CollapsibleMetrics metrics={[{ label: 'Sans unité', value: '42' }]} locale="fr" />,
    );
    const value = container.querySelector('p.text-2xl');
    expect(value?.textContent).toBe('42');
  });

  it('garde le point de rupture (break-words) sur la valeur et le libellé pour les métriques longues', () => {
    const { container } = render(
      <CollapsibleMetrics
        metrics={[
          {
            label: 'Werkloosheidsuitgeslotenen die OCMW aanspraken (Stad Brussel)',
            value: '3 567',
            unit: 'aanvragen',
          },
        ]}
        locale="nl"
      />,
    );
    const cell = container.querySelector('#collapsible-metrics-grid > div');
    expect(cell?.className).toContain('min-w-0');
    const value = container.querySelector('p.text-2xl');
    const label = container.querySelector('p.mt-1');
    expect(value?.className).toContain('break-words');
    expect(label?.className).toContain('break-words');
    expect(value?.textContent).toBe('3 567 aanvragen');
  });
});
