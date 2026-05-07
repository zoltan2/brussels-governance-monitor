// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { ReactNode } from 'react';

interface LayerProps {
  children: ReactNode;
}

/**
 * Density layer wrappers used in MDX content.
 *
 * Each renders a block-level `<div>` with the corresponding `.d-*` class.
 * Visibility is controlled purely by CSS rules in globals.css that target
 * `[data-density="..."] .d-...` selectors. The wrappers themselves hold no
 * state and are SSR-safe.
 *
 * EDITORIAL RULE (spec §5.3): NEVER wrap a `<Claim>` inside one of these.
 * If the claim's containing density block is hidden by the active density,
 * the trigger becomes display:none and the claim is no longer clickable
 * nor reachable via deep-link. Place claims in untagged content (always
 * visible regardless of density) instead.
 */
export function Signal({ children }: LayerProps) {
  return <div className="d-signal">{children}</div>;
}

export function Essentiel({ children }: LayerProps) {
  return <div className="d-essentiel">{children}</div>;
}

export function Complet({ children }: LayerProps) {
  return <div className="d-complet">{children}</div>;
}
