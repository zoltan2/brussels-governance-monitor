// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Server-side proxy prefixes — paths Next.js rewrites() forward to external services.
 *
 * MANDATORY: every prefix listed here MUST be served by a rewrite rule in next.config.ts
 * or by a route handler under src/app/<prefix>/. The middleware (src/proxy.ts) reads this list to bypass i18n locale-prefixing for
 * proxy routes. Forgetting to add a prefix here causes the middleware to redirect
 * /prefix/path → /fr/prefix/path (307), silently dropping all proxied requests.
 *
 * To add a new proxy:
 *   1. Add the prefix to PROXY_PREFIXES below.
 *   2. Add the rewrite rule(s) in next.config.ts rewrites().
 *   That's it — the middleware exclusion is automatic.
 */
export const PROXY_PREFIXES = [
  '/u', // Umami analytics — analytics.governance.brussels (self-hosted depuis le
        // 20/06/2026), pour contourner les bloqueurs de publicité. Deux chemins
        // seulement : le traceur `script.js` (réécriture, next.config.ts) et
        // `POST /u/api/send` (relais src/app/u/api/send/route.ts, sans cookie).
        // Aucune autre route de l'API Umami n'est exposée (revue du 28/09/2026).
] as const;
