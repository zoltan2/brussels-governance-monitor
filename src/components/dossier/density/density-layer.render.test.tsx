// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// @vitest-environment jsdom

import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Signal, Essentiel, Complet } from './density-layer';

describe('Density layer wrappers', () => {
  afterEach(cleanup);

  it('Signal renders <div class="d-signal">', () => {
    const { container } = render(<Signal>foo</Signal>);
    const div = container.firstElementChild;
    expect(div?.tagName).toBe('DIV');
    expect(div?.className).toBe('d-signal');
    expect(div?.textContent).toBe('foo');
  });

  it('Essentiel renders <div class="d-essentiel">', () => {
    const { container } = render(<Essentiel>bar</Essentiel>);
    const div = container.firstElementChild;
    expect(div?.tagName).toBe('DIV');
    expect(div?.className).toBe('d-essentiel');
  });

  it('Complet renders <div class="d-complet">', () => {
    const { container } = render(<Complet>baz</Complet>);
    const div = container.firstElementChild;
    expect(div?.tagName).toBe('DIV');
    expect(div?.className).toBe('d-complet');
  });
});
