// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Cookie de session du sondage : un identifiant aléatoire, rien d'autre.
 *
 * Cookie de SESSION (sans Max-Age) : la reprise d'un questionnaire commencé est
 * possible tant que le navigateur reste ouvert, pas au-delà. `Path=/` parce que
 * la page (/fr/sondage, /nl/enquete) le lit pour reprendre, et la route
 * /api/sondage pour enregistrer. Cookie technique strictement nécessaire : il
 * ne sert ni au suivi ni à la mesure d'audience.
 */
export const COOKIE_SONDAGE = 'bgm_sondage';

export function optionsCookieSondage() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}
