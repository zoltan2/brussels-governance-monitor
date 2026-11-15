// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { editionUrl, isMagazineLocale, type MagazineLocale } from '@/lib/magazine/locales';

interface MagazineLinkProps {
  weekShort: string; // e.g. "s15"
  lang: string;
}

const LABELS: Record<MagazineLocale, string> = {
  fr: 'Lire en version magazine',
  nl: 'Lees de magazine-versie',
  en: 'Read the magazine edition',
};

/**
 * Lien vers l'édition du magazine dans la langue du digest affiché. La page ne
 * le rend que si ce digest porte un bloc `magazine:` : une langue sans édition
 * cette semaine n'a pas de lien.
 */
export function MagazineLink({ weekShort, lang }: MagazineLinkProps) {
  if (!isMagazineLocale(lang)) return null;
  const href = editionUrl(lang, weekShort);
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded border border-neutral-900 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-900 hover:text-neutral-50"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span aria-hidden>📖</span>
      <span>{LABELS[lang]}</span>
      <span aria-hidden>→</span>
    </a>
  );
}
