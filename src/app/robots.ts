// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { headers } from 'next/headers';
import type { MetadataRoute } from 'next';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

  // The staging subdomain runs the exact same self-hosted image as production
  // (same SELF_HOST=1 build) — checking SELF_HOST here can't tell them apart.
  // Only the staging *hostname* must never be indexed: same content as the
  // canonical domain would create duplicate-content competition.
  const host = (await headers()).get('host') ?? '';
  if (host.startsWith('staging.')) {
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
