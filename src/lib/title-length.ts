// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Budget d'affichage du titre en résultat de recherche.
 *
 * POURQUOI CE LINT EXISTE, ET POURQUOI IL NE PEUT PAS ÊTRE UN `max()` DE SCHÉMA.
 *
 * `velite.config.ts` pose déjà `s.string().max(120)` sur le titre des fiches
 * secteur. **Cette contrainte ne bloque rien.** Velite l'écrit en `info` et le
 * build réussit :
 *
 *     content/sector-cards/education.nl.mdx
 *      info String must contain at most 120 character(s)  title
 *     [VELITE] build finished in 9163.49ms
 *
 * Les quatre fiches `education` font 125, 125, 127 et 139 caractères et figurent
 * bien dans `.velite/sectorCards.json`. Une contrainte qu'on croit active et qui
 * ne l'est pas est pire qu'une contrainte absente : elle donne une assurance
 * fausse, et personne ne relit.
 *
 * Mesure du 21/09/2026 : **231 fiches sur 380** portent un titre au-delà du
 * budget. Les fiches secteur sont le pire cas, 44 sur 44, moyenne de 86 à 93
 * caractères, maximum 139.
 *
 * LA CAUSE EST STRUCTURELLE. Le titre de la fiche sert à la fois de titre
 * éditorial et de titre de recherche, et la veille hebdomadaire ajoute un fait
 * au titre à chaque mise à jour. Les titres grossissent donc par construction.
 *
 * LE BUDGET. Le gabarit ajoute ` | BGM` (six caractères, voir le `template` de
 * `src/app/[locale]/layout.tsx`). Google coupe autour de soixante caractères :
 * le champ `title` dispose donc d'environ cinquante-quatre caractères.
 *
 * CE QUE CE LINT NE FAIT PAS. Il ne juge pas le texte et ne se déclenche jamais
 * sur une fiche qu'on ne touche pas, comme `summary-freshness`. La dette
 * existante se résorbe au rythme des republications ; ce qui est interdit, c'est
 * d'en créer de la nouvelle.
 */

/** Suffixe ajouté par le gabarit de métadonnées. */
export const TITLE_SUFFIX = ' | BGM';

/** Ce que Google affiche, en pratique, avant de couper. */
export const SERP_TITLE_BUDGET = 60;

/** Budget réellement disponible pour le champ `title` du frontmatter. */
export const TITLE_MAX = SERP_TITLE_BUDGET - TITLE_SUFFIX.length;

export type TitleVerdict = 'ok' | 'too-long' | 'missing';

export interface TitleCheck {
  verdict: TitleVerdict;
  /** Longueur du titre seul, suffixe exclu. */
  length: number;
  /** Longueur telle qu'elle s'affichera, suffixe compris. */
  rendered: number;
  /** Dépassement en caractères, 0 si conforme. */
  overflow: number;
}

/**
 * Une fiche peut court-circuiter le titre éditorial par `seoTitle`, introduit le
 * 19/09/2026 (PR #507). Quand il est présent, c'est LUI qui part en résultat de
 * recherche, rendu en titre absolu, donc SANS le suffixe : son budget est le
 * budget entier.
 *
 * C'est la porte de sortie prévue pour les titres à énumération : le titre long
 * reste au H1 et à l'écran, seul le titre de recherche est raccourci.
 */
export function checkTitleLength(params: {
  title: string | undefined;
  seoTitle?: string | undefined;
}): TitleCheck {
  const { title, seoTitle } = params;

  // `seoTitle` est rendu en titre absolu : pas de suffixe, budget entier.
  if (seoTitle !== undefined && seoTitle.trim() !== '') {
    const length = seoTitle.trim().length;
    return {
      verdict: length > SERP_TITLE_BUDGET ? 'too-long' : 'ok',
      length,
      rendered: length,
      overflow: Math.max(0, length - SERP_TITLE_BUDGET),
    };
  }

  if (title === undefined || title.trim() === '') {
    return { verdict: 'missing', length: 0, rendered: 0, overflow: 0 };
  }

  const length = title.trim().length;
  const rendered = length + TITLE_SUFFIX.length;
  return {
    verdict: length > TITLE_MAX ? 'too-long' : 'ok',
    length,
    rendered,
    overflow: Math.max(0, length - TITLE_MAX),
  };
}

/** Message d'erreur destiné à un humain qui vient de casser la règle. */
export function explainTitleLength(check: TitleCheck, seoTitleSupported: boolean): string {
  if (check.verdict === 'missing') return 'titre absent du frontmatter.';
  const base = `titre de ${check.length} caractères, ${check.rendered} avec « ${TITLE_SUFFIX.trim()} » : ${check.overflow} de trop, Google coupera.`;
  return seoTitleSupported
    ? `${base} Raccourcir le titre, ou ajouter un champ seoTitle de ${SERP_TITLE_BUDGET} caractères au plus, qui remplace le titre en résultat de recherche sans toucher au H1.`
    : `${base} Raccourcir le titre.`;
}
