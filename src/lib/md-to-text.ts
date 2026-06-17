// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Convertit du markdown *inline* (liens, gras, italique, code) en texte brut.
 * Usage : produire `acceptedAnswer.text` du JSON-LD FAQPage à partir d'une
 * réponse `a` qui n'autorise que du markdown léger (aucun bloc).
 */
export function mdToText(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images ![alt](url) -> alt (défensif)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // liens [texte](url) -> texte
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // gras **t** / __t__ -> t
    .replace(/(\*|_)(.*?)\1/g, '$2') // italique *t* / _t_ -> t
    .replace(/`([^`]+)`/g, '$1') // code `c` -> c
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1') // \* -> *
    .replace(/\s+/g, ' ')
    .trim();
}
