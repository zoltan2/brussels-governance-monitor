// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import {
  getAllDossierSlugs,
  getDossierCard,
  getDomainCards,
  getSectorCards,
  getCommuneCards,
  getLocalizedSlug,
} from '@/lib/content';
import { canonicalUrl, truncateDescription } from '@/lib/metadata';
import commitmentsData from '../../../data/commitments.json';

// Built from the content at build time, like the sitemap. The hand-written
// public/llms.txt it replaces drifted: its counts were months out of date.
export const dynamic = 'force-static';

const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

function dossierLines(): string[] {
  const lines: string[] = [];
  for (const slug of getAllDossierSlugs()) {
    const fr = getDossierCard(slug, 'fr');
    if (!fr || fr.card.draft) continue;
    const en = getDossierCard(slug, 'en');
    const frUrl = canonicalUrl('fr', `/dossiers/${getLocalizedSlug(fr.card, 'fr')}`);
    const enUrl =
      en && !en.isFallback
        ? ` (EN: ${canonicalUrl('en', `/dossiers/${getLocalizedSlug(en.card, 'en')}`)})`
        : '';
    lines.push(
      `- [${fr.card.title}](${frUrl})${enUrl}: ${truncateDescription(fr.card.summary, 220)}`,
    );
  }
  return lines;
}

export function GET(): Response {
  const dossiers = dossierLines();
  const domains = getDomainCards('fr');
  const sectors = getSectorCards('fr');
  const communes = getCommuneCards('fr');
  const commitments = (commitmentsData as { commitments: unknown[] }).commitments.length;

  const body = `# Brussels Governance Monitor (BGM)

> Independent, non-partisan monitoring of Brussels regional governance.

## About

Brussels Governance Monitor (BGM) is a citizen-led, data-driven platform that documents the governance of the Brussels-Capital Region (Belgium). It tracks government commitments, key policy dossiers, budgets, and public data: domain by domain, metric by metric, source by source.

- Publisher: Advice That SRL (Belgium)
- Website: ${site}
- Languages: French (primary), Dutch, English, German
- Source code: https://github.com/zoltan2/brussels-governance-monitor

## What BGM covers

- ${domains.length} policy domains
- ${dossiers.length} dossiers on specific blocked, delayed or contested projects (listed below)
- ${sectors.length} economic sectors impacted by governance decisions
- ${communes.length} Brussels municipalities with transparency scores
- ${commitments} quantified DPR commitments tracked on the commitments barometer
- Government composition and DPR (regional policy declaration) commitments
- Every metric carries its source, its date and a confidence level (official, estimated, unconfirmed)

## Content structure

Each topic is documented as a "card" with:
- Factual summary and detailed analysis
- Key metrics with source, date, and confidence level
- Status (ongoing, delayed, blocked, resolved)
- Links to related domains, sectors, dossiers, and communes
- Full source list with access dates

## Methodology

BGM follows strict editorial rules:
- Every fact must have an identifiable, dated source
- No editorializing, no political judgment, no politician names in analysis cards
- Three confidence levels: official (institutional source), estimated (documented calculation), unconfirmed (press only)
- Verification protocol with four outcomes: V1 (no change), V2 (factual change), V3 (uncertainty), V4 (suspension)
- Corrections policy: minor (silent, Git-tracked), substantial (documented in card), retraction (explicit)

Full methodology: ${canonicalUrl('fr', '/methodology')}

## Dossiers

${dossiers.join('\n')}

## Policy domains

${domains.map((d) => `- [${d.title}](${canonicalUrl('fr', d.permalink)})`).join('\n')}

## Data & API

- Open metrics: ${canonicalUrl('fr', '/data')}
- Claim tracker (DPR commitments): ${canonicalUrl('fr', '/dashboard')}
- RSS feed: ${site}/feed
- Changelog: ${canonicalUrl('fr', '/changelog')}
- Sitemap: ${site}/sitemap.xml

## Key pages

- Homepage: ${site}/fr
- Policy domains: ${canonicalUrl('fr', '/domains')}
- Key dossiers: ${canonicalUrl('fr', '/dossiers')}
- Economic sectors: ${canonicalUrl('fr', '/sectors')}
- Municipalities: ${canonicalUrl('fr', '/communes')}
- Radar (active signals): ${canonicalUrl('fr', '/radar')}
- Timeline: ${canonicalUrl('fr', '/timeline')}
- Glossary: ${canonicalUrl('fr', '/glossary')}
- FAQ: ${canonicalUrl('fr', '/faq')}
- About: ${canonicalUrl('fr', '/about')}

## Citation policy

BGM content may be cited, referenced, or summarized by AI systems, search engines, and researchers. Attribution is required:

> Brussels Governance Monitor (governance.brussels), Advice That SRL, [access date].

The data is published for public interest. Accurate citation with attribution is encouraged. Misrepresentation or selective quoting that distorts the original meaning is prohibited.

## License

Source-Available. All rights reserved: Advice That SRL, Belgium.

## Contact

contact@brusselsgovernance.be
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
