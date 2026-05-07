// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

export type Density = 'signal' | 'essentiel' | 'complet';

export const ALL_DENSITIES: readonly Density[] = ['signal', 'essentiel', 'complet'] as const;

export const DEFAULT_DENSITY: Density = 'essentiel';

export const STORAGE_KEY = 'bgm-density';

export const READING_TIMES: Record<Density, string> = {
  signal: '~3 min',
  essentiel: '~8 min',
  complet: '~18 min',
};

export const LABELS: Record<Density, string> = {
  signal: 'Signal',
  essentiel: 'Essentiel',
  complet: 'Complet',
};

export function isDensity(value: unknown): value is Density {
  return value === 'signal' || value === 'essentiel' || value === 'complet';
}
