// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

  // Self-hosted deployments (staging on Hetzner) must never be indexed: same
  // content as the Vercel production domain would create duplicate-content
  // competition. SELF_HOST is set at build and runtime for those images only.
  if (process.env.SELF_HOST === '1') {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/refonte', '/refonte/preview'],
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
      {
        userAgent: 'anthropic-ai',
        allow: '/',
        disallow: '/api/',
      },
      {
        userAgent: 'Applebot-Extended',
        allow: '/',
        disallow: '/api/',
      },
      {
        userAgent: 'CCBot',
        allow: '/',
        disallow: '/api/',
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
