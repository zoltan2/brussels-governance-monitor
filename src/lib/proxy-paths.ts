// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Server-side proxy prefixes — paths Next.js rewrites() forward to external services.
 *
 * MANDATORY: every prefix listed here MUST have a matching rewrite rule in next.config.ts.
 * The middleware (src/proxy.ts) reads this list to bypass i18n locale-prefixing for
 * proxy routes. Forgetting to add a prefix here causes the middleware to redirect
 * /prefix/path → /fr/prefix/path (307), silently dropping all proxied requests.
 *
 * To add a new proxy:
 *   1. Add the prefix to PROXY_PREFIXES below.
 *   2. Add the rewrite rule(s) in next.config.ts rewrites().
 *   That's it — the middleware exclusion is automatic.
 */
export const PROXY_PREFIXES = [
  '/u', // Umami analytics — proxied to cloud.umami.is to bypass ad blockers
] as const;
