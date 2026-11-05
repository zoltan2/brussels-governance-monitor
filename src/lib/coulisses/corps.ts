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

/**
 * Vrai si le corps est du HTML (éditeur, ou HTML collé qui commence par une
 * balise en ligne ou un commentaire) plutôt que le texte brut d'avant l'éditeur.
 * Un texte brut qui contient « a < b » reste du texte.
 */
export function estHtml(corps: string): boolean {
  return /^\s*(<!--|<\/?[a-z][a-z0-9]*(\s[^>]*)?\/?>)/i.test(corps);
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

/**
 * Repère du bloc sondage dans le modèle de bienvenue : un paragraphe qui ne
 * contient que « [sondage] ». À l'envoi, il est remplacé par le bloc de la
 * langue tant que la campagne du sondage est ouverte (src/lib/sondage/campagne.ts),
 * et retiré sinon : les autres paragraphes ne changent pas.
 */
export const REPERE_SONDAGE = '[sondage]';
const PARAGRAPHE_REPERE = /<p>\s*\[sondage\]\s*<\/p>/gi;

export function contientRepereSondage(corps: string): boolean {
  return new RegExp(PARAGRAPHE_REPERE.source, 'i').test(nettoyerCorps(corps));
}

/** Corps de bienvenue prêt à l'envoi : repère remplacé par le bloc, ou retiré. */
export function assemblerBienvenue(corps: string, blocSondage: string | undefined, sondageOuvert: boolean): string {
  const bloc = sondageOuvert && blocSondage && !corpsVide(blocSondage) ? nettoyerCorps(blocSondage) : '';
  return nettoyerCorps(corps).replace(PARAGRAPHE_REPERE, bloc);
}

/**
 * Paramètres UTM ajoutés à l'envoi aux liens du corps qui mènent au site
 * (décision de Zoltán, 5 novembre 2026). Les mêmes pour tous les
 * destinataires d'un envoi : Umami sait qu'une visite vient des coulisses de
 * tel mois, jamais de qui. Les liens vers d'autres sites, les mailto et les
 * liens qui portent déjà un utm_ sont laissés tels quels. Le pied de page
 * (préférences, refus) n'est pas concerné : il n'est pas dans le corps.
 */
export interface Utm {
  campagne: string;
  contenu: string;
}

export function marquerLiens(corps: string, siteUrl: string, utm: Utm): string {
  let hoteSite: string;
  try {
    hoteSite = new URL(siteUrl).hostname.replace(/^www\./, '');
  } catch {
    return corps;
  }
  return sanitizeHtml(nettoyerCorps(corps), {
    ...BASE,
    transformTags: {
      a: (tag, attribs) => {
        const href = attribs.href;
        if (!href) return { tagName: tag, attribs };
        let url: URL;
        try {
          url = new URL(href);
        } catch {
          return { tagName: tag, attribs };
        }
        const memeSite = (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.replace(/^www\./, '') === hoteSite;
        const dejaMarque = [...url.searchParams.keys()].some((k) => k.startsWith('utm_'));
        if (!memeSite || dejaMarque) return { tagName: tag, attribs };
        url.searchParams.set('utm_source', 'bgm-coulisses');
        url.searchParams.set('utm_medium', 'email');
        url.searchParams.set('utm_campaign', utm.campagne);
        url.searchParams.set('utm_content', utm.contenu);
        return { tagName: tag, attribs: { ...attribs, href: url.toString() } };
      },
    },
  });
}
