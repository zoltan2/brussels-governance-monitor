// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Instrumentation } from 'next';
import { noterErreurRendu } from '@/lib/render-errors';

export function register() {}

/**
 * Chaque erreur de rendu serveur est notée pour `/api/health` (voir
 * src/lib/render-errors.ts). Surtout celles d'une régénération ISR
 * (`revalidateReason` renseigné) : Next sert alors l'ancienne page en 200, et
 * rien d'autre ne le signale.
 */
export const onRequestError: Instrumentation.onRequestError = (_error, _request, context) => {
  noterErreurRendu({ routePath: context.routePath, revalidateReason: context.revalidateReason });
};
