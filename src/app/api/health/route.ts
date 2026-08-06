// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Sonde de vie, et surtout sonde de VERSION.
 *
 * `version` porte le commit dont l'image tourne, injecté au build par le
 * Dockerfile. Sans lui, aucun contrôle post-déploiement n'est possible : le VPS
 * tire l'image via un timer systemd toutes les 5 minutes, donc le succès du
 * workflow qui pousse l'image ne dit rien de ce que la production sert.
 * Vaut `unknown` hors image Docker (dev local, tests).
 */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    version: process.env.BUILD_SHA ?? 'unknown',
  });
}
