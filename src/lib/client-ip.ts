// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Extraction de l'IP appelante — utilitaire UNIQUE.
 *
 * Prendre la DERNIÈRE valeur de `x-forwarded-for` : Caddy la réécrit avec
 * `{client_ip}`, qui vaut l'IP visiteur réelle via Cloudflare (trusted_proxies
 * configuré sur ses plages) et l'IP du pair direct sinon. La PREMIÈRE valeur est
 * envoyée par le client : toute limitation de débit fondée dessus se contourne en
 * faisant tourner l'en-tête.
 *
 * `CF-Connecting-IP` est volontairement ignoré : le pare-feu du VPS ouvre 443 à
 * tous et l'origine répond en direct, donc cet en-tête est choisi par l'attaquant
 * dès qu'il court-circuite Cloudflare.
 */
export function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
    const last = parts.at(-1);
    if (last) return last;
  }
  return headers.get('x-real-ip')?.trim() || 'unknown';
}
