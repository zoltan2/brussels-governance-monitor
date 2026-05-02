// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// @vitest-environment jsdom

import { render, renderHook, act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DensityProvider, useDensity } from './density-context';
import { STORAGE_KEY } from './types';

describe('DensityProvider + useDensity', () => {
  beforeEach(() => {
    // Confirm jsdom exposes localStorage natively (post-review §9.1).
    expect(typeof localStorage).toBe('object');
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('initial density is essentiel by default', () => {
    const { result } = renderHook(() => useDensity(), {
      wrapper: ({ children }) => <DensityProvider>{children}</DensityProvider>,
    });
    expect(result.current.density).toBe('essentiel');
  });

  it('setDensity updates current value and persists to localStorage', () => {
    const { result } = renderHook(() => useDensity(), {
      wrapper: ({ children }) => <DensityProvider>{children}</DensityProvider>,
    });

    act(() => {
      result.current.setDensity('signal');
    });

    expect(result.current.density).toBe('signal');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('signal');
  });

  it('reads stored density from localStorage on mount', async () => {
    localStorage.setItem(STORAGE_KEY, 'complet');
    const { result, rerender } = renderHook(() => useDensity(), {
      wrapper: ({ children }) => <DensityProvider>{children}</DensityProvider>,
    });
    // useEffect runs after mount; force re-render and check
    rerender();
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.density).toBe('complet');
  });

  it('ignores invalid stored values', async () => {
    localStorage.setItem(STORAGE_KEY, 'bidon-value');
    const { result, rerender } = renderHook(() => useDensity(), {
      wrapper: ({ children }) => <DensityProvider>{children}</DensityProvider>,
    });
    rerender();
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.density).toBe('essentiel'); // fallback
  });

  it('renders a wrapper div with data-density attribute', () => {
    const { container } = render(
      <DensityProvider>
        <span>content</span>
      </DensityProvider>,
    );
    const wrapper = container.querySelector('[data-density]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('data-density')).toBe('essentiel');
  });

  it('useDensity throws outside a provider', () => {
    expect(() =>
      renderHook(() => useDensity()),
    ).toThrow('useDensity must be called within a DensityProvider');
  });
});
