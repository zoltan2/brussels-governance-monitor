// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Composants propres aux dossiers, utilisables dans le MDX des dossiers.
// Rendus côté SERVEUR uniquement, par `DossierMdxContent` : leur code et leurs
// libellés restent dans le HTML et ne partent jamais en JS client.
//
// ⛔ Ne jamais importer ce module (ni un composant de `dossiers/`) depuis un
// module `'use client'` : il repartirait en JS sur toutes les pages qui
// rendent du MDX. Garde : `src/components/mdx-bundle-boundary.test.ts`.
// Un composant ajouté ici doit rester un composant serveur (ni hook, ni
// gestionnaire d'événement) ; s'il lui faut de l'interactivité, isoler la
// partie interactive dans un petit composant `'use client'` qu'il importe.

import { CpasThreeAuthorities } from '@/components/dossiers/cpas-three-authorities';
import { CpasMoneyFlow } from '@/components/dossiers/cpas-money-flow';
import { CpasProceduresTracker } from '@/components/dossiers/cpas-procedures-tracker';
import { RechauffementChantiersTable } from '@/components/dossiers/rechauffement/chantiers-table';
import { RechauffementEauCounters } from '@/components/dossiers/rechauffement/eau-counters';
import { RechauffementHeatCounters } from '@/components/dossiers/rechauffement/heat-counters';
import { RechauffementResponsibilityMatrix } from '@/components/dossiers/rechauffement/responsibility-matrix';
import type { MdxComponents } from '@/components/mdx-components';

export const dossierMdxComponents: MdxComponents = {
  CpasThreeAuthorities,
  CpasMoneyFlow,
  CpasProceduresTracker,
  RechauffementChantiersTable,
  RechauffementEauCounters,
  RechauffementHeatCounters,
  RechauffementResponsibilityMatrix,
};
