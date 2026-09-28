// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Extrait de recherche Pagefind, rendu SANS `dangerouslySetInnerHTML`.
 *
 * Pagefind livre l'extrait en HTML : texte echappe et termes trouves entoures de
 * `<mark>`. Il etait nettoye par une expression reguliere puis injecte tel quel.
 * La regex ne retirait qu'une balise fermee par `>` : `a<img src=x onerror=...`
 * passait. La defense reposait donc sur l'echappement fait par Pagefind, pas sur
 * notre code (revue red team du 28/09).
 *
 * Ici, l'extrait est decoupe sur `<mark>`/`</mark>` en segments de TEXTE, que
 * React echappe lui-meme au rendu. Aucune autre balise ne peut en sortir : ce
 * qui ressemble a du HTML devient du texte visible, jamais un element.
 */

export interface ExcerptSegment {
  text: string;
  mark: boolean;
}

const ENTITES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Decode les entites courantes et numeriques ; laisse les autres telles quelles. */
function decoderEntites(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (tout, nom: string) => {
    if (nom[0] === '#') {
      const code = nom[1] === 'x' || nom[1] === 'X' ? parseInt(nom.slice(2), 16) : Number(nom.slice(1));
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : tout;
    }
    return ENTITES[nom.toLowerCase()] ?? tout;
  });
}

/** Retire toute balise, fermee ou non, puis decode les entites. */
function texteSeul(html: string): string {
  return decoderEntites(html.replace(/<[^>]*(>|$)/g, ''));
}

export function excerptSegments(html: string): ExcerptSegment[] {
  const segments: ExcerptSegment[] = [];
  const pousser = (brut: string, mark: boolean) => {
    const text = texteSeul(brut);
    if (text) segments.push({ text, mark });
  };

  // `<mark ...>` ouvre, `</mark>` ferme ; tout le reste est du texte.
  const motif = /<mark\b[^>]*>([\s\S]*?)<\/mark\s*>/gi;
  let dernier = 0;
  for (const m of html.matchAll(motif)) {
    pousser(html.slice(dernier, m.index), false);
    pousser(m[1], true);
    dernier = m.index + m[0].length;
  }
  pousser(html.slice(dernier), false);
  return segments;
}
