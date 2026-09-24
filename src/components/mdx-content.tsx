// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

// Rendu MDX CLIENT, pour les fiches (communes, digest, domaines, secteurs…).
// Les dossiers passent par `DossierMdxContent` (rendu serveur) : leurs
// composants ne doivent jamais entrer ici, sinon ils partent en JS sur tout
// le site. Garde : `src/components/mdx-bundle-boundary.test.ts`.

import { useMemo } from 'react';
import { MetricsProvider } from '@/components/proof-drawer/metrics-context';
import type { Metric } from '@/components/proof-drawer/types';
import { baseMdxComponents, renderMdx } from '@/components/mdx-components';

interface MdxContentProps {
  code: string;
  metrics?: Metric[];
}

export function MdxContent({ code, metrics = [] }: MdxContentProps) {
  // IMPORTANT: depend on [code] only — `metrics` flows through MetricsProvider,
  // not into the compiled MDX module. Re-evaluating new Function(code) on every
  // metrics change would be expensive and unnecessary.
  const element = useMemo(() => renderMdx(code, baseMdxComponents), [code]);

  return <MetricsProvider metrics={metrics}>{element}</MetricsProvider>;
}
