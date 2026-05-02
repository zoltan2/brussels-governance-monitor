// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// @vitest-environment jsdom

import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { ScrollyHeader } from './scrolly-header';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

expect.extend(matchers);

describe('ScrollyHeader', () => {
  afterEach(cleanup);

  it('renders back link to structured view with correct href', () => {
    const { container } = render(
      <ScrollyHeader slug="cpas-bruxellois" locale="fr" lastModified="2026-05-02" />,
    );
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/fr/dossiers/cpas-bruxellois');
    expect(link?.textContent).toContain('Vue détaillée');
  });

  it('renders the lastModified date in localized format', () => {
    const { container } = render(
      <ScrollyHeader slug="cpas-bruxellois" locale="fr" lastModified="2026-05-02" />,
    );
    expect(container.textContent).toContain('Mis à jour');
  });

  it('back link has aria-label for accessibility', () => {
    const { container } = render(
      <ScrollyHeader slug="cpas-bruxellois" locale="fr" lastModified="2026-05-02" />,
    );
    const link = container.querySelector('a');
    expect(link?.getAttribute('aria-label')).toBe('Retour à la vue détaillée du dossier');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <ScrollyHeader slug="cpas-bruxellois" locale="fr" lastModified="2026-05-02" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
