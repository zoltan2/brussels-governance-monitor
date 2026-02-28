// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextRequest } from 'next/server';

import {
  getDomainCards,
  getDossierCards,
  getFormationEvents,
  getSectorCards,
  getSolutionCards,
} from '@/lib/content';
import type { Locale } from '@/i18n/routing';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

const VALID_LOCALES = new Set<string>(['fr', 'nl', 'en', 'de']);

const VALID_SECTIONS = new Set([
  'domains',
  'solutions',
  'dossiers',
  'formation',
  'sectors',
]);

const SECTION_LABELS: Record<string, string> = {
  domains: 'Domains',
  solutions: 'Solutions',
  dossiers: 'Dossiers',
  formation: 'Formation',
  sectors: 'Sectors',
};

const CHANNEL_DESCRIPTIONS: Record<string, string> = {
  fr: 'Rendre la gouvernance bruxelloise visible, vérifiable et compréhensible',
  nl: 'Het Brusselse bestuur zichtbaar, verifieerbaar en begrijpelijk maken',
  en: 'Making Brussels governance visible, verifiable and understandable',
  de: 'Die Brüsseler Regierungsführung sichtbar, überprüfbar und verständlich machen',
};

const LOCALE_TAGS: Record<string, string> = {
  fr: 'fr-BE',
  nl: 'nl-BE',
  en: 'en',
  de: 'de',
};

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function collectItems(
  sections: string[],
  locale: Locale,
): FeedItem[] {
  const items: FeedItem[] = [];

  for (const section of sections) {
    switch (section) {
      case 'domains':
        for (const card of getDomainCards(locale)) {
          items.push({
            title: card.title,
            link: `${SITE_URL}/${locale}${card.permalink}`,
            description: card.summary,
            pubDate: new Date(card.lastModified).toUTCString(),
            category: 'domains',
          });
        }
        break;

      case 'solutions':
        for (const card of getSolutionCards(locale)) {
          items.push({
            title: card.title,
            link: `${SITE_URL}/${locale}${card.permalink}`,
            description: card.mechanism,
            pubDate: new Date(card.lastModified).toUTCString(),
            category: 'solutions',
          });
        }
        break;

      case 'dossiers':
        for (const card of getDossierCards(locale)) {
          items.push({
            title: card.title,
            link: `${SITE_URL}/${locale}${card.permalink}`,
            description: card.summary,
            pubDate: new Date(card.lastModified).toUTCString(),
            category: 'dossiers',
          });
        }
        break;

      case 'formation':
        for (const event of getFormationEvents(locale)) {
          items.push({
            title: event.title,
            link: `${SITE_URL}/${locale}${event.permalink}`,
            description: event.summary,
            pubDate: new Date(event.date).toUTCString(),
            category: 'formation',
          });
        }
        break;

      case 'sectors':
        for (const card of getSectorCards(locale)) {
          items.push({
            title: card.title,
            link: `${SITE_URL}/${locale}${card.permalink}`,
            description: card.humanImpact || card.title,
            pubDate: new Date(card.lastModified).toUTCString(),
            category: 'sectors',
          });
        }
        break;
    }
  }

  return items;
}

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const localeParam = searchParams.get('locale') || 'fr';
  const locale = (VALID_LOCALES.has(localeParam) ? localeParam : 'fr') as Locale;

  const sectionParam = searchParams.get('section');
  const sections = sectionParam && VALID_SECTIONS.has(sectionParam)
    ? [sectionParam]
    : [...VALID_SECTIONS];

  const items = collectItems(sections, locale)
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 50);

  const isSingleSection = sections.length === 1;
  const channelTitle = isSingleSection
    ? `Brussels Governance Monitor — ${SECTION_LABELS[sections[0]]}`
    : 'Brussels Governance Monitor';

  const feedPath = isSingleSection
    ? `/feed?section=${sections[0]}${locale !== 'fr' ? `&locale=${locale}` : ''}`
    : `/feed${locale !== 'fr' ? `?locale=${locale}` : ''}`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${SITE_URL}/${locale}</link>
    <description>${escapeXml(CHANNEL_DESCRIPTIONS[locale])}</description>
    <language>${LOCALE_TAGS[locale]}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}${feedPath}" rel="self" type="application/rss+xml"/>${items
      .map(
        (item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
      <category>${escapeXml(item.category)}</category>
    </item>`,
      )
      .join('')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
