// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

const ALLOWED_PROTOCOLS = new Set(['https:']);

/**
 * Validates a URL string for safe rendering as `<a href>`.
 *
 * Returns the URL string if and only if:
 * - it parses as a valid absolute URL via single-arg `new URL()`
 * - its protocol is in the allowlist (https: only)
 *
 * Returns `null` for any invalid or disallowed URL — the component MUST render
 * the source label as plain text without a link, NOT throw.
 *
 * Allowlist rationale:
 * - 'https:' only — BGM never links to insecure http endpoints. If a source is
 *   only available via http, the editor must escalate (find an https mirror,
 *   archive via web.archive.org, or accept the source can't be linked).
 * - 'http:' EXCLUDED.
 * - 'javascript:' EXCLUDED — XSS direct.
 * - 'data:' EXCLUDED — XSS via data:text/html.
 * - 'vbscript:', 'file:', 'about:', etc. EXCLUDED by default (not in allowlist).
 *
 * Absolute URL requirement: `new URL(input)` is called with a SINGLE argument,
 * no `base`. Relative URLs (`../foo`, `//evil.com/payload`) throw `TypeError:
 * Invalid URL` and are caught, returning null. NEVER pass `window.location.href`
 * (or any base) as the second argument here — it would resolve relatives against
 * the current page and silently accept malformed input.
 *
 * Defense in depth: Velite already validates URL syntax via `s.string().url()`
 * at build time, but does not check the protocol. This is the runtime layer.
 *
 * Null/undefined input (defensive against `.velite/dossierCards.json` schema
 * drift): typeof check rejects early. The function is safe even if the upstream
 * type contract is violated.
 */
export function safeUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}
