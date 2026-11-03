// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Corps d'un numéro des coulisses : du HTML écrit dans l'éditeur de l'admin
 * (Tiptap), nettoyé ici à l'enregistrement ET au rendu.
 *
 * Seules les balises que propose l'éditeur passent : paragraphes, intertitres,
 * gras, italique, liens, listes, citation, saut de ligne. Liens en https,
 * http ou mailto seulement. Le reste est retiré, contenu gardé.
 *
 * Un corps ancien en texte brut (paragraphes séparés par une ligne vide) est
 * converti en paragraphes : rien d'enregistré avant l'éditeur ne se perd.
 *
 * Les clients mail ignorent souvent les feuilles de style : chaque balise
 * reçoit son style en ligne au rendu (`htmlPourMail`).
 */
import sanitizeHtml from 'sanitize-html';

const BALISES = ['p', 'h2', 'h3', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'br', 'blockquote'];

const BASE: sanitizeHtml.IOptions = {
  allowedTags: BALISES,
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['https', 'http', 'mailto'],
  allowProtocolRelative: false,
  // b et i (collés depuis un traitement de texte) deviennent strong et em.
  transformTags: { b: 'strong', i: 'em', h1: 'h2', h4: 'h3' },
};

const POLICE = 'Georgia, "Times New Roman", serif';
const COULEUR = '#1f2937';
const STYLES: Record<string, string> = {
  p: `color:${COULEUR};font-size:16px;line-height:1.6;margin:0 0 16px;font-family:${POLICE}`,
  h2: `color:#0f172a;font-size:20px;line-height:1.3;margin:28px 0 12px;font-weight:bold;font-family:${POLICE}`,
  h3: `color:#0f172a;font-size:17px;line-height:1.4;margin:24px 0 10px;font-weight:bold;font-family:${POLICE}`,
  a: 'color:#1e3a5f;text-decoration:underline',
  ul: `color:${COULEUR};font-size:16px;line-height:1.6;margin:0 0 16px;padding-left:24px;font-family:${POLICE}`,
  ol: `color:${COULEUR};font-size:16px;line-height:1.6;margin:0 0 16px;padding-left:24px;font-family:${POLICE}`,
  li: 'margin:0 0 6px',
  blockquote: `color:#334155;font-style:italic;margin:0 0 16px;padding-left:14px;border-left:3px solid #cbd5e1;font-family:${POLICE}`,
};

function echapper(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Vrai si le corps vient de l'éditeur (HTML) plutôt que du texte brut d'avant. */
export function estHtml(corps: string): boolean {
  return /^\s*<(p|h[1-6]|ul|ol|blockquote|div)\b/i.test(corps);
}

/** Texte brut ancien → paragraphes HTML (retours simples gardés). */
export function texteVersHtml(corps: string): string {
  return corps
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.split('\n').map(echapper).join('<br>')}</p>`)
    .join('');
}

/** HTML propre, sans style : ce qui est enregistré et rechargé dans l'éditeur. */
export function nettoyerCorps(corps: string): string {
  const html = estHtml(corps) ? corps : texteVersHtml(corps);
  return sanitizeHtml(html, BASE)
    .replace(/<p>\s*<\/p>/g, '')
    .trim();
}

/** HTML prêt pour le mail : nettoyé, chaque balise avec son style en ligne. */
export function htmlPourMail(corps: string): string {
  const transformTags: sanitizeHtml.IOptions['transformTags'] = { ...BASE.transformTags };
  for (const [balise, style] of Object.entries(STYLES)) {
    transformTags[balise] = (tagName, attribs) => ({ tagName, attribs: { ...attribs, style } });
  }
  return sanitizeHtml(nettoyerCorps(corps), {
    ...BASE,
    allowedAttributes: { ...BASE.allowedAttributes, '*': ['style'] },
    transformTags,
  });
}

/** Texte sans balise d'un fragment HTML, espaces resserrés. */
export function texteSeul(html: string): string {
  return sanitizeHtml(html.replace(/<br\s*\/?>/gi, ' ').replace(/<\/(p|h2|h3|li|blockquote)>/gi, ' '), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Vrai si le corps n'a aucun texte (éditeur vide : « <p></p> »). */
export function corpsVide(corps: string): boolean {
  return texteSeul(nettoyerCorps(corps)) === '';
}
