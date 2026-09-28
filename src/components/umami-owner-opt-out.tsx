// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useEffect } from 'react';
import { excludeThisDeviceFromAnalytics } from '@/lib/analytics';

/**
 * Marque l'appareil courant comme appareil du propriétaire : Umami n'enverra
 * plus rien depuis ce navigateur, sur AUCUNE page du site.
 *
 * Monté dans les layouts /admin et /review, qui vérifient la session avant de
 * rendre quoi que ce soit : un lecteur qui tape /fr/admin est redirigé vers
 * /login sans jamais exécuter ce composant. La page /login n'en porte pas,
 * exprès : n'importe qui peut l'ouvrir, et un lecteur curieux ne doit pas
 * disparaître des statistiques. Après connexion, on arrive de toute façon sur
 * /admin.
 *
 * Voir `excludeThisDeviceFromAnalytics` (src/lib/analytics.ts) pour la clé lue
 * par le traceur et la manière de réintégrer un appareil à la main.
 */
export function UmamiOwnerOptOut() {
  useEffect(() => {
    excludeThisDeviceFromAnalytics();
  }, []);
  return null;
}
