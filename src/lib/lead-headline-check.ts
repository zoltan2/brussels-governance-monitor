// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Titre d'email et de la barre « Dernière mise à jour » tiré d'un `changeSummary`.
 *
 * Le titre est la première phrase du résumé, calculée par `leadSplit`
 * (src/lib/lead-split.ts), et il sert deux fois : objet de la carte du digest
 * envoyé aux abonnés, et barre « Dernière mise à jour » de l'accueil depuis #581.
 * La barre appelle `leadSplit` SANS `digestHeadline` (src/lib/latest-update-headline.ts) :
 * un titre manuel ne la répare donc pas, seule la première phrase compte.
 *
 * Trois façons de rater ce titre, toutes vues dans le dépôt le 28/09/2026 :
 *  - une première phrase de plus de 120 caractères : `leadSplit` coupe au mot et
 *    ajoute « … » (88 titres sur 336, revue orange) ;
 *  - une date allemande « am 19. August » : le point de l'ordinal passe pour une
 *    fin de phrase, et le titre devient « Das Gericht hat am 19. »
 *    (commune-cards/uccle.de.mdx) ;
 *  - une parenthèse coupée au même piège : « Erstes BGM-Dossier zur Foire du
 *    Midi (146. » (dossiers/foire-du-midi.de.mdx).
 *
 * La règle a été écrite le 13/09 (mémoire feedback_changesummary_is_digest_lead)
 * et le piège allemand documenté le 23/09, sans aucune garde : ce module est la
 * garde. Il appelle la VRAIE fonction `leadSplit`, pas une copie.
 *
 * Module pur, sans accès disque.
 */

import { leadSplit } from './lead-split';

/**
 * Ordinal allemand en fin de titre : « am 19. », « (146. », « vom 5. ».
 * Un à trois chiffres seulement : une année (« 2026. ») termine une vraie phrase.
 * Le nombre ne doit pas être la fin d'un nombre groupé (« 360 000. »).
 */
const ORDINAL_FINAL = /(?:^|\(|(?<!\d)\s)\d{1,3}\.$/;

/**
 * Ce qui suit un ordinal de date : un mois, ou un mot en minuscule. Une phrase
 * qui finit vraiment sur un nombre (« nicht bei 62. Die … ») repart sur une
 * majuscule qui n'est pas un mois, et ne doit pas être signalée.
 */
const SUITE_DE_DATE = /^(?:Januar|Jänner|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|\p{Ll})/u;

function parenthesesOuvertes(text: string): boolean {
  let depth = 0;
  for (const ch of text) {
    if (ch === '(') depth++;
    else if (ch === ')' && depth > 0) depth--;
  }
  return depth > 0;
}

/**
 * Problème du titre produit par `leadSplit(changeSummary)`, ou null s'il est sain.
 * `locale` vient du nom de fichier (`.de.mdx`) : la coupe à l'ordinal ne se produit
 * qu'en allemand, où « 19. » est la forme normale d'une date.
 */
export function leadHeadlineProblem(changeSummary: string | undefined, locale?: string): string | null {
  const text = (changeSummary ?? '').trim();
  if (!text) return null;
  const { headline, body } = leadSplit(text);

  if (headline.endsWith('…')) {
    return (
      `titre tronqué « ${headline} ». La première phrase du changeSummary dépasse 120 caractères : ` +
      'leadSplit la coupe et ajoute « … », dans l\'email du digest comme sur la barre de l\'accueil. ' +
      'Raccourcir la première phrase (120 caractères au plus, terminée par un point).'
    );
  }
  if (parenthesesOuvertes(headline)) {
    return (
      `titre coupé dans une parenthèse « ${headline} ». Un point à l'intérieur de la parenthèse ` +
      '(ordinal, abréviation) a été pris pour une fin de phrase. Reformuler la première phrase.'
    );
  }
  if (locale === 'de' && ORDINAL_FINAL.test(headline) && SUITE_DE_DATE.test(body)) {
    return (
      `titre coupé sur une date allemande « ${headline} ». Le point de l'ordinal (« am 19. August ») ` +
      'passe pour une fin de phrase. Écrire la date sans ordinal en tête (« am 19.08.2026 ») ou la ' +
      'déplacer après la première phrase.'
    );
  }
  return null;
}

/** Locale d'un fichier de fiche (`slug.de.mdx` → `de`), ou undefined. */
export function localeOfCardFile(file: string): string | undefined {
  return /\.([a-z]{2})\.mdx$/.exec(file)?.[1];
}
