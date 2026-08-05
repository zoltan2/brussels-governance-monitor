// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Mention de traduction automatique affichée sur les éditions du digest.
 *
 * Contexte réglementaire : art. 50 du règlement (UE) 2024/1689, applicable
 * depuis le 2 août 2026. Le contenu généré par IA destiné à informer le public
 * doit être étiqueté, sauf relecture humaine substantielle sous responsabilité
 * éditoriale assumée.
 *
 * Périmètre réel du digest : le français est relu systématiquement, les autres
 * langues sont produites par traduction automatique et relues au cas par cas.
 * La mention est donc affichée dès que `auto_translated` est vrai, c'est-à-dire
 * sur toutes les langues sauf le français.
 *
 * Le texte est rendu dans la langue de la page. Toute langue absente de cette
 * table retombe sur l'anglais : une mention approximative vaut mieux qu'une
 * mention absente.
 */
export interface DigestNotice {
  /** Étiquette courte affichée dans la ligne de méta, sous le titre. */
  badge: string;
  /** Phrase complète affichée en pied d'édition. */
  disclaimer: string;
  /** Libellé du lien vers la version française de référence. */
  readFrench: string;
}

const NOTICES: Record<string, DigestNotice> = {
  fr: {
    badge: 'Traduction automatique',
    disclaimer:
      "Cette version a été produite par traduction automatique et n'a pas fait l'objet d'une relecture systématique. La version française est la version de référence.",
    readFrench: 'Lire la version française',
  },
  nl: {
    badge: 'Automatische vertaling',
    disclaimer:
      'Deze versie werd automatisch vertaald en is niet systematisch nagelezen. De Franse versie is de referentieversie.',
    readFrench: 'Lees de Franse versie',
  },
  en: {
    badge: 'Machine translation',
    disclaimer:
      'This version was produced by machine translation and has not been systematically reviewed. The French version is the reference version.',
    readFrench: 'Read the French version',
  },
  de: {
    badge: 'Maschinelle Übersetzung',
    disclaimer:
      'Diese Fassung wurde maschinell übersetzt und nicht systematisch geprüft. Die französische Fassung ist die Referenzfassung.',
    readFrench: 'Französische Fassung lesen',
  },
  ar: {
    badge: 'ترجمة آلية',
    disclaimer:
      'أُنتجت هذه النسخة بالترجمة الآلية ولم تخضع لمراجعة منهجية. النسخة الفرنسية هي النسخة المرجعية.',
    readFrench: 'اقرأ النسخة الفرنسية',
  },
  es: {
    badge: 'Traducción automática',
    disclaimer:
      'Esta versión se ha producido mediante traducción automática y no ha sido revisada sistemáticamente. La versión francesa es la versión de referencia.',
    readFrench: 'Leer la versión francesa',
  },
  pl: {
    badge: 'Tłumaczenie maszynowe',
    disclaimer:
      'Ta wersja została utworzona za pomocą tłumaczenia maszynowego i nie była systematycznie weryfikowana. Wersja francuska jest wersją referencyjną.',
    readFrench: 'Przeczytaj wersję francuską',
  },
  pt: {
    badge: 'Tradução automática',
    disclaimer:
      'Esta versão foi produzida por tradução automática e não foi revista sistematicamente. A versão francesa é a versão de referência.',
    readFrench: 'Ler a versão francesa',
  },
  ro: {
    badge: 'Traducere automată',
    disclaimer:
      'Această versiune a fost produsă prin traducere automată și nu a fost verificată sistematic. Versiunea franceză este versiunea de referință.',
    readFrench: 'Citiți versiunea franceză',
  },
  sw: {
    badge: 'Tafsiri ya mashine',
    disclaimer:
      'Toleo hili limetolewa kwa tafsiri ya mashine na halijakaguliwa kwa utaratibu. Toleo la Kifaransa ndilo toleo la marejeleo.',
    readFrench: 'Soma toleo la Kifaransa',
  },
  tr: {
    badge: 'Makine çevirisi',
    disclaimer:
      'Bu sürüm makine çevirisiyle üretilmiştir ve sistematik olarak gözden geçirilmemiştir. Fransızca sürüm referans sürümdür.',
    readFrench: 'Fransızca sürümü okuyun',
  },
};

export function getDigestNotice(lang: string): DigestNotice {
  return NOTICES[lang] ?? NOTICES.en!;
}
