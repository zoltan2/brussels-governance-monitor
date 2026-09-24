// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup, screen } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { DossierAlert, type AlertSeverity } from './dossier-alert';
import fr from '../../../messages/fr.json';
import nl from '../../../messages/nl.json';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

// Les VRAIS messages, pas des libellés inventés : c'est le seul moyen de vérifier que
// la clé `dossiers.alertSeverity.*` existe réellement et n'a pas dérivé du composant.
const MESSAGES = { fr, nl } as const;

function severityLabel(locale: keyof typeof MESSAGES, severity: AlertSeverity): string {
  return MESSAGES[locale].dossiers.alertSeverity[severity];
}

afterEach(() => cleanup());

describe('DossierAlert', () => {
  (['fr', 'nl'] as const).forEach((locale) => {
    (['info', 'warning', 'critical'] as const).forEach((severity) => {
      it(`shows the ${severity} severity as visible text in ${locale}`, () => {
        render(
          <ul>
            <DossierAlert
              label="Vote reporté en commission"
              severity={severity}
              severityLabel={severityLabel(locale, severity)}
              formattedDate="24 septembre 2026"
            />
          </ul>,
        );

        // Le défaut corrigé : une alerte "critical" ne portait sa gravité que par la
        // couleur (constat revue du 24/09/2026, /fr/dossiers/metro-3). Le libellé
        // traduit doit apparaître comme texte visible, pas seulement en couleur.
        expect(screen.getByText(`${severityLabel(locale, severity)} :`)).toBeTruthy();
        expect(screen.getByText('Vote reporté en commission')).toBeTruthy();
      });
    });
  });

  it('passes axe with no violations for a critical alert', async () => {
    const { container } = render(
      <ul>
        <DossierAlert
          label="Vote reporté en commission"
          severity="critical"
          severityLabel={severityLabel('fr', 'critical')}
          formattedDate="24 septembre 2026"
        />
      </ul>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps the severity label visible to sighted users, not sr-only', () => {
    // Mutation proof: this test only passes if the label text is actually rendered
    // and not hidden with sr-only/aria-hidden. Removing the label from the component
    // (or hiding it visually) must fail this test.
    render(
      <ul>
        <DossierAlert
          label="Vote reporté en commission"
          severity="critical"
          severityLabel={severityLabel('fr', 'critical')}
          formattedDate="24 septembre 2026"
        />
      </ul>,
    );

    const labelNode = screen.getByText('Critique :');
    expect(labelNode.className).not.toMatch(/sr-only/);
    expect(labelNode.closest('[aria-hidden="true"]')).toBeNull();
  });
});
