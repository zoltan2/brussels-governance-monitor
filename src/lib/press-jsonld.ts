// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Données structurées de la page Presse & données, volontairement sobres.
 *
 * - `CollectionPage` rattachée au site et à l'organisation déclarés par le
 *   layout (`#website`, `#organization`) : aucune entité en double.
 * - `ItemList` des mentions : un nom et une URL par entrée, rien d'autre.
 *   Pas de `NewsArticle` : ces articles ne sont pas les nôtres, et en déclarer
 *   un reviendrait à publier en notre nom un auteur et une date que seul
 *   l'éditeur tiers garantit.
 * - Le fil d'Ariane (`BreadcrumbList`) est émis par le composant `Breadcrumb`.
 */

import type { PressMention } from '@/lib/press';

export function buildPressJsonLd({
  siteUrl,
  pageUrl,
  locale,
  name,
  description,
  mentions,
}: {
  siteUrl: string;
  pageUrl: string;
  locale: string;
  name: string;
  description: string;
  mentions: PressMention[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${pageUrl}#page`,
    url: pageUrl,
    name,
    description,
    inLanguage: locale,
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: { '@id': `${siteUrl}/#organization` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: mentions.length,
      itemListElement: mentions.map((m, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${m.outlet} : ${m.title}`,
        url: m.url,
      })),
    },
  };
}
