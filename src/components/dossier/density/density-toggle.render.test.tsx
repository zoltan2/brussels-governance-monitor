// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// @vitest-environment jsdom

import { render, fireEvent, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { DensityProvider } from './density-context';
import { DensityToggle } from './density-toggle';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

expect.extend(matchers);

describe('DensityToggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders 3 native radio inputs with proper names', () => {
    const { container } = render(
      <DensityProvider>
        <DensityToggle />
      </DensityProvider>,
    );
    const radios = container.querySelectorAll('input[type="radio"][name="bgm-density"]');
    expect(radios.length).toBe(3);
    const values = Array.from(radios).map((r) => r.getAttribute('value'));
    expect(values).toEqual(['signal', 'essentiel', 'complet']);
  });

  it('checks the active radio (essentiel by default)', () => {
    const { container } = render(
      <DensityProvider>
        <DensityToggle />
      </DensityProvider>,
    );
    const checked = container.querySelector('input[type="radio"]:checked');
    expect(checked?.getAttribute('value')).toBe('essentiel');
  });

  it('clicking a radio updates the data-density wrapper', () => {
    const { container } = render(
      <DensityProvider>
        <DensityToggle />
      </DensityProvider>,
    );
    const signalRadio = container.querySelector('input[value="signal"]') as HTMLInputElement;
    fireEvent.click(signalRadio);
    const wrapper = container.querySelector('[data-density]');
    expect(wrapper?.getAttribute('data-density')).toBe('signal');
  });

  it('renders within a fieldset with radiogroup label', () => {
    const { container } = render(
      <DensityProvider>
        <DensityToggle />
      </DensityProvider>,
    );
    const fieldset = container.querySelector('fieldset[aria-label="Profondeur de lecture"]');
    expect(fieldset).not.toBeNull();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <DensityProvider>
        <DensityToggle />
      </DensityProvider>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
