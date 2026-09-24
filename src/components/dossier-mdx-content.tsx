// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Rendu MDX SERVEUR des dossiers (`dossiers/[slug]` et sa vue scrolly).
// Composant serveur, volontairement sans directive : le MDX est évalué au
// rendu (build), les composants de dossier y sont rendus en HTML et leur code
// ne part pas dans le bundle client. Seuls les îlots interactifs de la table
// commune (`Claim`, `SignalLead`) et `MetricsProvider` restent des composants
// client, référencés comme tels.

import { MetricsProvider } from '@/components/proof-drawer/metrics-context';
import type { Metric } from '@/components/proof-drawer/types';
import { baseMdxComponents, renderMdx } from '@/components/mdx-components';
import { dossierMdxComponents } from '@/components/dossiers/mdx-components';

interface DossierMdxContentProps {
  code: string;
  metrics?: Metric[];
}

const components = { ...baseMdxComponents, ...dossierMdxComponents };

export function DossierMdxContent({ code, metrics = [] }: DossierMdxContentProps) {
  return <MetricsProvider metrics={metrics}>{renderMdx(code, components)}</MetricsProvider>;
}
