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

/**
 * Frontmatter lu par les gardes éditoriales (FAQ, chapeau, lastModified).
 *
 * Un vrai parseur YAML plutôt qu'une expression régulière par ligne : la
 * version ligne à ligne acceptait deux `faqReviewed` dans la même fiche (la
 * première gagnait, Velite retient la dernière), manquait une question écrite
 * en bloc `>-`, et lisait une clé mal indentée comme si elle était valide.
 *
 * Schéma JSON : les dates non guillemetées restent des chaînes, comme la CI
 * les compare. Une clé dupliquée ou un YAML invalide lève
 * `FrontmatterError` : une garde qui ne peut pas lire échoue, elle ne passe pas.
 *
 * @returns null si le fichier n'a pas de frontmatter.
 */
export class FrontmatterError extends Error {}

export function readGuardFrontmatter(raw: string): Record<string, unknown> | null {
  const input = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(input);
  if (!match) return null;
  let parsed: unknown;
  try {
    parsed = yaml.load(match[1], { schema: yaml.JSON_SCHEMA });
  } catch (err) {
    const reason = err instanceof Error ? err.message.split('\n')[0] : String(err);
    throw new FrontmatterError(`frontmatter YAML illisible : ${reason}`);
  }
  if (parsed === null || parsed === undefined) return {};
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new FrontmatterError("frontmatter YAML illisible : ce n'est pas un dictionnaire de clés");
  }
  return parsed as Record<string, unknown>;
}

export default matter;
