// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Garde d'origine pour les routes d'écriture de l'administration.
 *
 * Le cookie de session est `SameSite=Lax` : il écarte un site tiers, mais PAS
 * un sous-domaine. `analytics.governance.brussels` sert un Umami auto-hébergé,
 * mis à jour à la main — une faille chez lui suffirait sinon à faire écrire
 * ces routes depuis la session de l'administrateur. Et `Request.json()`
 * ignorant le `Content-Type`, un simple formulaire en `text/plain` fabrique un
 * corps JSON valide sans déclencher de préflight CORS.
 *
 * Une seule route du dépôt portait cette garde ; ce module la rend testable.
 */
export function sameOriginRefusal(headers: Headers): string | null {
  const host = headers.get('host');
  const origin = headers.get('origin');
  const sameOrigin =
    headers.get('sec-fetch-site') === 'same-origin' &&
    origin !== null &&
    host !== null &&
    URL.parse(origin)?.host === host;
  return sameOrigin ? null : 'Origine non autorisée';
}
