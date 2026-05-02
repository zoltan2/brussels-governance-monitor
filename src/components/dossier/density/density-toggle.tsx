// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { ALL_DENSITIES, LABELS, READING_TIMES, type Density } from './types';
import { useDensity } from './density-context';

/**
 * Density toggle UI — three radio inputs for signal / essentiel / complet.
 *
 * Uses NATIVE `<input type="radio">` (spec §6.2 post-review) rather than
 * `<button role="radio">`: native keyboard navigation (Tab to focus group,
 * Arrow keys to switch options, Space to activate) and consistent screen
 * reader announcement across browsers (VoiceOver, NVDA, JAWS).
 *
 * Visual styling via Tailwind `peer` pattern: input is `sr-only` (visually
 * hidden but in the accessibility tree), the adjacent `<span>` is the
 * styled visual that reacts to `peer-checked:` and `peer-focus-visible:`.
 *
 * Sticky positioning at the top of the dossier content area. Will not
 * stick beyond the parent's bounds.
 */
export function DensityToggle() {
  const { density, setDensity } = useDensity();

  return (
    <fieldset
      className="sticky top-0 z-10 -mx-4 mb-6 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80"
      aria-label="Profondeur de lecture"
    >
      <legend className="sr-only">Profondeur de lecture</legend>
      <span aria-hidden="true" className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Lecture
      </span>
      <div className="flex gap-1" role="radiogroup">
        {ALL_DENSITIES.map((d) => (
          <DensityRadio
            key={d}
            value={d}
            current={density}
            onChange={setDensity}
          />
        ))}
      </div>
    </fieldset>
  );
}

interface DensityRadioProps {
  value: Density;
  current: Density;
  onChange: (next: Density) => void;
}

function DensityRadio({ value, current, onChange }: DensityRadioProps) {
  const isActive = current === value;
  return (
    <label className="relative cursor-pointer">
      <input
        type="radio"
        name="bgm-density"
        value={value}
        checked={isActive}
        onChange={() => onChange(value)}
        className="peer sr-only"
      />
      <span
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-brand-50 peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-checked:text-white peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-700 peer-focus-visible:ring-offset-2"
      >
        {LABELS[value]}
        <span className="text-[10px] font-mono opacity-70">{READING_TIMES[value]}</span>
      </span>
    </label>
  );
}
