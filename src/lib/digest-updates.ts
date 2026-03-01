// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { getDomainCards, getDossierCards, getSectorCards, getCommuneCards } from '@/lib/content';
import { SECTOR_TO_DOMAIN, DOSSIER_SLUG_TO_TOPIC } from '@/lib/resend';
import type { DigestUpdate } from '@/emails/digest';
import type { Locale } from '@/i18n/routing';

const SUPPORTED_LOCALES: Locale[] = ['fr', 'nl', 'en', 'de'];

export interface DigestCounts {
  domains: number;
  dossiers: number;
  sectors: number;
  communes: number;
}

export interface CollectedDigest {
  byLocale: Record<string, DigestUpdate[]>;
  updatedTopics: string[];
  counts: DigestCounts;
}

/** Append UTM parameters to a URL. */
function withUtm(url: string, campaign: string, content: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}utm_source=bgm-digest&utm_medium=email&utm_campaign=${encodeURIComponent(campaign)}&utm_content=${encodeURIComponent(content)}`;
}

/**
 * Collect all updated content across domains, dossiers, sectors, and communes.
 * Returns updates grouped by locale with topic identifiers for subscriber filtering.
 * If `campaign` is provided (e.g. "2026-w09"), UTM parameters are appended to all URLs.
 */
export function collectDigestUpdates(cutoff: string, siteUrl: string, campaign?: string): CollectedDigest {
  const byLocale: Record<string, DigestUpdate[]> = {};
  const topicSet = new Set<string>();
  const frCounts: DigestCounts = { domains: 0, dossiers: 0, sectors: 0, communes: 0 };

  for (const locale of SUPPORTED_LOCALES) {
    const updates: DigestUpdate[] = [];

    // --- Domain cards ---
    const domainCards = getDomainCards(locale);
    for (const c of domainCards) {
      if (c.lastModified < cutoff) continue;
      topicSet.add(c.domain);
      if (locale === 'fr') frCounts.domains++;
      updates.push({
        title: c.title,
        domain: c.domain,
        section: 'domains',
        status: c.status,
        summary: (c.changeSummary && !c.changeSummary.toLowerCase().includes('domain card'))
          ? c.changeSummary
          : c.summary,
        url: campaign
          ? withUtm(`${siteUrl}/${locale}/domains/${c.slug}`, campaign, c.domain)
          : `${siteUrl}/${locale}/domains/${c.slug}`,
      });
    }

    // --- Dossier cards ---
    const dossierCards = getDossierCards(locale);
    for (const c of dossierCards) {
      if (c.lastModified < cutoff) continue;
      const topic = DOSSIER_SLUG_TO_TOPIC[c.slug] || `dossier-${c.slug}`;
      topicSet.add(topic);
      if (locale === 'fr') frCounts.dossiers++;
      updates.push({
        title: c.title,
        domain: topic,
        section: 'dossiers',
        phase: c.phase,
        summary: c.summary,
        url: campaign
          ? withUtm(`${siteUrl}/${locale}/dossiers/${c.slug}`, campaign, topic)
          : `${siteUrl}/${locale}/dossiers/${c.slug}`,
      });
    }

    // --- Sector cards ---
    const sectorCards = getSectorCards(locale);
    for (const c of sectorCards) {
      if (c.lastModified < cutoff) continue;
      topicSet.add(c.slug);
      if (locale === 'fr') frCounts.sectors++;
      updates.push({
        title: c.title,
        domain: c.slug,
        section: 'sectors',
        summary: c.humanImpact || c.title,
        url: campaign
          ? withUtm(`${siteUrl}/${locale}/sectors/${c.slug}`, campaign, c.slug)
          : `${siteUrl}/${locale}/sectors/${c.slug}`,
      });
    }

    // --- Commune cards ---
    const communeCards = getCommuneCards(locale);
    for (const c of communeCards) {
      if (c.lastModified < cutoff) continue;
      const topic = `commune-${c.slug}`;
      topicSet.add(topic);
      if (locale === 'fr') frCounts.communes++;
      updates.push({
        title: c.title,
        domain: topic,
        section: 'communes',
        summary: c.title,
        url: campaign
          ? withUtm(`${siteUrl}/${locale}/communes/${c.slug}`, campaign, topic)
          : `${siteUrl}/${locale}/communes/${c.slug}`,
      });
    }

    byLocale[locale] = updates;
  }

  return {
    byLocale,
    updatedTopics: [...topicSet],
    counts: frCounts,
  };
}

/**
 * Filter updates for a specific subscriber based on their topic preferences.
 * - Empty topics = gets everything
 * - Exact topic match
 * - Generic match: 'dossiers' → all dossier updates, 'communes' → all commune updates
 * - Sector→domain expansion: subscriber to 'horeca' also gets 'employment' domain updates
 */
export function filterUpdatesForSubscriber(
  allUpdates: DigestUpdate[],
  subscriberTopics: string[],
): DigestUpdate[] {
  if (subscriberTopics.length === 0) return allUpdates;

  const matchSet = new Set<string>();
  let matchAllDossiers = false;
  let matchAllCommunes = false;

  for (const t of subscriberTopics) {
    if (t === 'solutions') continue;
    if (t === 'dossiers') {
      matchAllDossiers = true;
      continue;
    }
    if (t === 'communes') {
      matchAllCommunes = true;
      continue;
    }
    matchSet.add(t);
    // Sector→domain expansion (existing behavior)
    const parent = SECTOR_TO_DOMAIN[t];
    if (parent) matchSet.add(parent);
  }

  return allUpdates.filter((u) => {
    if (matchSet.has(u.domain)) return true;
    if (matchAllDossiers && u.section === 'dossiers') return true;
    if (matchAllCommunes && u.section === 'communes') return true;
    return false;
  });
}

/**
 * Generate a localized summary line from update counts.
 * e.g. "7 domaines, 3 dossiers, 1 secteur mis à jour"
 */
export function generateSummaryLine(counts: DigestCounts, locale: string): string {
  const parts: string[] = [];

  const labels: Record<string, { domains: [string, string]; dossiers: [string, string]; sectors: [string, string]; communes: [string, string]; suffix: string; none: string }> = {
    fr: {
      domains: ['domaine', 'domaines'],
      dossiers: ['dossier', 'dossiers'],
      sectors: ['secteur', 'secteurs'],
      communes: ['commune', 'communes'],
      suffix: 'mis à jour',
      none: 'Aucune mise à jour cette semaine.',
    },
    nl: {
      domains: ['domein', 'domeinen'],
      dossiers: ['dossier', 'dossiers'],
      sectors: ['sector', 'sectoren'],
      communes: ['gemeente', 'gemeenten'],
      suffix: 'bijgewerkt',
      none: 'Geen updates deze week.',
    },
    en: {
      domains: ['domain', 'domains'],
      dossiers: ['dossier', 'dossiers'],
      sectors: ['sector', 'sectors'],
      communes: ['commune', 'communes'],
      suffix: 'updated',
      none: 'No updates this week.',
    },
    de: {
      domains: ['Bereich', 'Bereiche'],
      dossiers: ['Dossier', 'Dossiers'],
      sectors: ['Sektor', 'Sektoren'],
      communes: ['Gemeinde', 'Gemeinden'],
      suffix: 'aktualisiert',
      none: 'Keine Aktualisierungen diese Woche.',
    },
  };

  const l = labels[locale] || labels.fr;

  if (counts.domains > 0) parts.push(`${counts.domains} ${counts.domains === 1 ? l.domains[0] : l.domains[1]}`);
  if (counts.dossiers > 0) parts.push(`${counts.dossiers} ${counts.dossiers === 1 ? l.dossiers[0] : l.dossiers[1]}`);
  if (counts.sectors > 0) parts.push(`${counts.sectors} ${counts.sectors === 1 ? l.sectors[0] : l.sectors[1]}`);
  if (counts.communes > 0) parts.push(`${counts.communes} ${counts.communes === 1 ? l.communes[0] : l.communes[1]}`);

  if (parts.length === 0) return l.none;
  return `${parts.join(', ')} ${l.suffix}`;
}
