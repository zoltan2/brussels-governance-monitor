// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_DENSITY, STORAGE_KEY, isDensity, type Density } from './types';

interface DensityContextValue {
  density: Density;
  setDensity: (next: Density) => void;
}

const DensityContext = createContext<DensityContextValue | null>(null);

interface DensityProviderProps {
  children: ReactNode;
}

/**
 * Provides current density + setter to descendants.
 *
 * SSR-safe: initial state is DEFAULT_DENSITY (`'essentiel'`) on the server.
 * After hydration, localStorage is read and applied if a valid stored value
 * exists. This may cause a brief visual flash if the user previously chose
 * a non-default density. Pre-paint script anti-flash is OUT OF SCOPE for
 * phase 3a-1 (see spec §4.2 — accepted trade-off).
 */
export function DensityProvider({ children }: DensityProviderProps) {
  const [density, setDensityState] = useState<Density>(DEFAULT_DENSITY);

  // Hydration: read localStorage once after mount, swap state if valid.
  // The set-state-in-effect lint rule discourages calling setState in effects
  // in general, but this IS the correct shape for one-time syncing from an
  // external store on mount (localStorage). useSyncExternalStore would
  // require manual 'storage' event subscription and is overkill for this
  // single-tab use case.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isDensity(stored)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDensityState(stored);
      }
    } catch {
      // localStorage may throw in some browser modes (e.g. private mode quota).
      // Silent fallback to default — no UI break.
    }
  }, []);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Same fail-quiet rationale as read.
    }
  }, []);

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      <div data-density={density} className="dossier-density-scope">
        {children}
      </div>
    </DensityContext.Provider>
  );
}

export function useDensity(): DensityContextValue {
  const ctx = useContext(DensityContext);
  if (!ctx) {
    throw new Error('useDensity must be called within a DensityProvider');
  }
  return ctx;
}
