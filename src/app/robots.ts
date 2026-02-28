import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/api/',
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: '/api/',
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: '/api/',
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: '/api/',
      },
      {
        userAgent: 'GoogleOther',
        allow: '/',
        disallow: '/api/',
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
