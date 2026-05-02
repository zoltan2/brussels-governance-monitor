// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useContext, type ReactNode } from 'react';
import { DensityContext } from './density-context';

interface SignalLeadProps {
  children: ReactNode;
}

/**
 * 1-phrase décisive par section, visible UNIQUEMENT en mode signal sur la
 * vue scrolly. Sur la page structurée (sans `DensityProvider` en scope),
 * rend `null` — pas de redondance avec la narrative `<Essentiel>`.
 *
 * Convention éditoriale (spec D2 §4) : ≤ 25 mots, auto-portant, lisible
 * hors contexte. À placer JUSTE après le H2/H3 de section, AVANT
 * `<Essentiel>`. Une seule occurrence par section.
 *
 * Spec : bgm-ops/specs/2026-05-02-option-d2-signal-lead-editorial-convention.md
 */
export function SignalLead({ children }: SignalLeadProps) {
  const ctx = useContext(DensityContext);
  // Pas de provider = page structurée → invisible (no doublon avec Essentiel)
  if (!ctx) return null;
  // Provider présent = scrolly → rend avec .d-signal pour CSS densité
  return <div className="d-signal">{children}</div>;
}
