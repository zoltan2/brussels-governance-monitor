// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import yaml from 'js-yaml';

export interface ParsedFrontmatter {
  /** Parsed YAML frontmatter (empty object if none). */
  data: Record<string, unknown>;
  /** Document body after the closing `---`. */
  content: string;
}

/**
 * Minimal frontmatter parser — drop-in replacement for `gray-matter`'s
 * `matter(raw)` for our trusted `---`-delimited MDX/Markdown.
 *
 * Why not gray-matter: it pins js-yaml 3.x (no patch for GHSA-h67p-54hq-rp68).
 * js-yaml 4.x `load` is safe-by-default (== the old `safeLoad`) and patched.
 *
 * Only the standard leading-frontmatter case is supported (the only shape used
 * in this repo). No custom delimiters, no excerpts.
 */
export function matter(raw: string): ParsedFrontmatter {
  // Strip a leading UTF-8 BOM if present.
  const input = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(input);
  if (!match) {
    return { data: {}, content: input };
  }

  const parsed = yaml.load(match[1]);
  const data =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};

  return { data, content: match[2] };
}

export default matter;
