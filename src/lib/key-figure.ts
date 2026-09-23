// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Un chiffre clé ne s'affiche en grand que s'il est un nombre.
 *
 * Sur l'accueil, `KeyFigure` rend `metrics[0].value` en gros caractères gras,
 * au-dessus du titre de la carte dans la hiérarchie visuelle. C'est juste pour
 * « 62 234 » ou « ~430 millions », faux pour « Budget 2026 voté en plénière
 * (53/32) » ou « 30 juin 2027 » : le 23/09/2026, cinq fiches affichées à
 * l'accueil mettaient une phrase ou une date dans `value`, et la phrase
 * écrasait le titre de la carte.
 *
 * Le critère ne compte pas les lettres : une première version le faisait, et
 * classait « ~430 millions » en texte, « 1 jaar » en texte mais « 1 an » en
 * nombre. Il demande quatre choses, identiques dans les quatre langues :
 *   - la valeur commence par un nombre, éventuellement précédé d'un signe
 *     d'approximation, de comparaison ou d'une devise (« ~27 », « €57.8M ») ;
 *   - elle ne contient aucun nom de mois : c'est alors une date ;
 *   - elle n'est pas une année seule (« 2018 ») : c'est aussi une date ;
 *   - elle porte au plus deux mots après le nombre, ordres de grandeur non
 *     comptés : « ~3,4 millions tonnes/an » est un nombre et son unité,
 *     « 2026 budget voted in plenary (53/32) » est une phrase.
 */
const NUMBER_START = /^[~≈±+\-−<>≤≥€$£]*\s*\d/u;

const YEAR_ONLY = /^(19|20)\d{2}$/;

// Noms de mois en fr, nl, en et de, complets et abrégés, comparés en minuscules.
const MONTHS = [
  'janvier', 'février', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'aout',
  'septembre', 'octobre', 'novembre', 'décembre', 'decembre',
  'januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'oktober',
  'january', 'february', 'march', 'may', 'june', 'july', 'august', 'september', 'october',
  'november', 'december',
  'januar', 'februar', 'märz', 'maerz', 'dezember',
  'janv', 'févr', 'fevr', 'avr', 'juil', 'sept', 'oct', 'nov', 'déc', 'dec',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'okt', 'dez',
];
const MONTH_WORD = new RegExp(`(^|[^\\p{L}])(${MONTHS.join('|')})(?=[^\\p{L}]|$)`, 'iu');

// Ordres de grandeur écrits en toutes lettres : ils font partie du nombre.
const MAGNITUDES = new Set([
  'million', 'millions', 'milliard', 'milliards', 'miljoen', 'miljard', 'millionen', 'milliarde',
  'milliarden', 'billion', 'billions', 'mio', 'mrd', 'bn', 'mln',
]);
const MAX_UNIT_WORDS = 2;

function unitWordCount(v: string): number {
  const words = v.toLowerCase().match(/\p{L}{3,}/gu) ?? [];
  return words.filter((w) => !MAGNITUDES.has(w)).length;
}

export function isNumericFigure(value: string): boolean {
  const v = value.trim();
  if (!NUMBER_START.test(v)) return false;
  if (YEAR_ONLY.test(v)) return false;
  if (MONTH_WORD.test(v)) return false;
  return unitWordCount(v) <= MAX_UNIT_WORDS;
}
