// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { SOURCE_LOCALE, editionUrl, isMagazineLocale, type MagazineLocale } from './locales';

/**
 * Adresse du magazine à mettre dans l'email du digest d'un abonné (décision de
 * Zoltán du 15/11/2026) : l'édition de sa langue si elle existe cette semaine,
 * sinon l'édition française, sinon rien.
 *
 * `hasBlock` dit si le digest publié de la semaine porte un bloc `magazine:`
 * dans une langue. Jusqu'au 15/11/2026 les routes lisaient `digest.magazine`
 * dans data/pending-digest.json, qui n'a jamais eu ce champ : aucun email ne
 * portait le lien.
 *
 * Sans bloc français, aucune édition n'est construite (le français est la
 * langue source) : pas de lien, même si une traduction porte un bloc.
 */
export function magazineUrlForSubscriber(
  week: string,
  locale: string,
  hasBlock: (lang: MagazineLocale) => boolean,
): string | undefined {
  const number = week.split('-w')[1];
  if (!number || !/^\d{2}$/.test(number)) return undefined;
  if (!hasBlock(SOURCE_LOCALE)) return undefined;
  const weekShort = `s${number}`;
  if (isMagazineLocale(locale) && hasBlock(locale)) return editionUrl(locale, weekShort);
  return editionUrl(SOURCE_LOCALE, weekShort);
}
