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

  // Wrap dans un <div> au lieu de mettre sticky sur <fieldset> directement.
  // Raison : Chromium a des bugs historiques avec position:sticky sur fieldset
  // (le rendering spécial du fieldset peut empêcher le stick de s'activer).
  // Le <fieldset> reste à l'intérieur pour la sémantique radiogroup.
  return (
    <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-neutral-200 bg-neutral-50/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-neutral-50/80">
      <fieldset
        className="flex flex-wrap items-center gap-x-2 gap-y-1.5"
        aria-label="Profondeur de lecture"
      >
        <legend className="sr-only">Profondeur de lecture</legend>
        <span
          aria-hidden="true"
          className="hidden text-xs font-medium uppercase tracking-wide text-neutral-500 min-[400px]:inline"
        >
          Lecture
        </span>
        <div className="flex flex-wrap gap-1" role="radiogroup">
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
    </div>
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
        className="inline-flex flex-col items-center gap-0.5 whitespace-nowrap rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-brand-50 peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-checked:text-neutral-50 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-700 peer-focus-visible:ring-offset-2 min-[400px]:flex-row min-[400px]:gap-1.5 min-[400px]:px-3 min-[400px]:py-1.5"
      >
        {LABELS[value]}
        {/* Sous le libellé (colonne) sous 400 px, à côté (ligne) au-delà : le
            bouton reste large comme son libellé, jamais comme libellé + temps
            de lecture côte à côte, donc les trois tiennent à 320 px sans
            masquer le temps de lecture (revue PR #602). */}
        {/* `opacity-70` (avant) tombait à 4.21:1 contre les 4.5:1 requis une
            fois le temps de lecture rendu visible à toutes les largeurs (revue
            PR #602) — même piège que le badge « bêta » (voir plus haut) :
            l'opacité ne swappe pas et n'est pas un token de couleur. */}
        <span className="text-[10px] font-mono">{READING_TIMES[value]}</span>
      </span>
    </label>
  );
}
