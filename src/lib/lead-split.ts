// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Split a fresh summary into a punchy headline + body for the digest card.
 * - A manual `digestHeadline` always wins (kept short by schema); body = full text.
 * - Else: use the first sentence if it is short enough; otherwise truncate at a word
 *   boundary (~110 chars) with an ellipsis. Never repeats the static card title.
 */
export function leadSplit(text: string, manual?: string): { headline: string; body: string } {
  const t = (text || '').trim();
  if (manual && manual.trim()) return { headline: manual.trim(), body: t };
  if (!t) return { headline: '', body: '' };
  const sentEnd = t.search(/(?<=[.!?])\s/);
  if (sentEnd >= 0 && sentEnd + 1 <= 120) {
    return { headline: t.slice(0, sentEnd + 1).trim(), body: t.slice(sentEnd + 1).trim() };
  }
  const space = t.lastIndexOf(' ', 110);
  const at = space > 40 ? space : Math.min(t.length, 110);
  if (at >= t.length) return { headline: t, body: '' };
  return { headline: t.slice(0, at).trim() + '…', body: t.slice(at).trim() };
}
