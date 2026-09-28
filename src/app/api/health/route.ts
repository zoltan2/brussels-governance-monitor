// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { bilanErreursRendu } from '@/lib/render-errors';

export const dynamic = 'force-dynamic';

/**
 * Sonde de vie, et surtout sonde de VERSION.
 *
 * `version` porte le commit dont l'image tourne, injecté au build par le
 * Dockerfile. Sans lui, aucun contrôle post-déploiement n'est possible : le VPS
 * tire l'image via un timer systemd toutes les 5 minutes, donc le succès du
 * workflow qui pousse l'image ne dit rien de ce que la production sert.
 * Vaut `unknown` hors image Docker (dev local, tests).
 *
 * `renderErrors` : bilan des erreurs de rendu serveur des dernières 24 h, dont
 * les régénérations ISR en échec (la page servie reste alors l'ancienne, en
 * 200, sans autre trace que `docker logs`). Lu par la sonde de l'accueil du
 * VPS (bgm-ops, deploy/sonde-accueil). `status` reste `ok` : la sonde de vie
 * ne doit pas basculer pour une page en erreur, c'est la sonde de contenu qui
 * alerte.
 */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    version: process.env.BUILD_SHA ?? 'unknown',
    renderErrors: bilanErreursRendu(),
  });
}
