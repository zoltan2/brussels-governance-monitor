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

  // A crawler named in its own group ignores the '*' group entirely, so every
  // group repeats the shared exclusions.
  // Les pages d'administration et de relecture sont deja en noindex et
  // redirigent vers la connexion sans session (#513). La ligne ci-dessous est
  // une ceinture en plus de la bretelle : elle evite qu'un robot depense son
  // budget de passage sur des redirections, sous n'importe quelle langue.
  const privatePaths = ['/api/', '/refonte', '/refonte/preview', '/*/admin', '/*/review', '/*/login'];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: privatePaths,
      },
      // Search and agent crawlers fetch pages to cite them with a link: they bring
      // readers (ChatGPT, Perplexity, Claude, Gemini). Kept open on purpose.
      {
        userAgent: [
          'OAI-SearchBot',
          'ChatGPT-User',
          'Claude-SearchBot',
          'Claude-User',
          'PerplexityBot',
          'Perplexity-User',
          'GoogleOther',
        ],
        allow: '/',
        disallow: privatePaths,
      },
      // Training crawlers feed model weights and send no reader back. Cloudflare
      // blocks them with a 403 (AI bot policies, "Training" preset, decision of
      // 19/09/2026); this group says the same thing instead of contradicting it.
      {
        userAgent: [
          'GPTBot',
          'ClaudeBot',
          'anthropic-ai',
          'CCBot',
          'Amazonbot',
          'Bytespider',
          'Applebot-Extended',
        ],
        disallow: '/',
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
