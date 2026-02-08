import { getDomainCards, getSolutionCards } from '@/lib/content';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function GET() {
  const domainCards = getDomainCards('fr');
  const solutionCards = getSolutionCards('fr');

  const items = [
    ...domainCards.map((card) => ({
      title: card.title,
      link: `${SITE_URL}/fr${card.permalink}`,
      description: card.summary,
      pubDate: new Date(card.lastModified).toUTCString(),
      category: 'domain',
    })),
    ...solutionCards.map((card) => ({
      title: card.title,
      link: `${SITE_URL}/fr${card.permalink}`,
      description: card.mechanism,
      pubDate: new Date(card.lastModified).toUTCString(),
      category: 'solution',
    })),
  ].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Brussels Governance Monitor</title>
    <link>${SITE_URL}</link>
    <description>Rendre la gouvernance bruxelloise visible, vérifiable et compréhensible</description>
    <language>fr-BE</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed" rel="self" type="application/rss+xml"/>
    ${items
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
