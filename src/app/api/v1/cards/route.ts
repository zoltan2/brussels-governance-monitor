// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import {
  getDomainCards,
  getSolutionCards,
  getSectorCards,
  getComparisonCards,
} from '@/lib/content';
import type { Locale } from '@/i18n/routing';

const VALID_LOCALES = ['fr', 'nl', 'en', 'de'];
const VALID_TYPES = ['domain', 'solution', 'sector', 'comparison'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = (searchParams.get('locale') || 'fr') as Locale;
  const type = searchParams.get('type');

  if (!VALID_LOCALES.includes(locale)) {
    return NextResponse.json(
      { error: `Invalid locale. Use: ${VALID_LOCALES.join(', ')}` },
      { status: 400 },
    );
  }

  if (type && !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Use: ${VALID_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  const result: Record<string, unknown[]> = {};

  if (!type || type === 'domain') {
    result.domains = getDomainCards(locale).map((c) => ({
      slug: c.slug,
      title: c.title,
      domain: c.domain,
      status: c.status,
      summary: c.summary,
      confidenceLevel: c.confidenceLevel,
      metrics: c.metrics,
      sources: c.sources,
      lastModified: c.lastModified,
    }));
  }

  if (!type || type === 'solution') {
    result.solutions = getSolutionCards(locale).map((c) => ({
      slug: c.slug,
      title: c.title,
      feasibility: c.feasibility,
      timeline: c.timeline,
      mechanism: c.mechanism,
      whoCanTrigger: c.whoCanTrigger,
      risks: c.risks,
      lastModified: c.lastModified,
    }));
  }

  if (!type || type === 'sector') {
    result.sectors = getSectorCards(locale).map((c) => ({
      slug: c.slug,
      title: c.title,
      parentDomain: c.parentDomain,
      sector: c.sector,
      humanImpact: c.humanImpact,
      frozenMechanisms: c.frozenMechanisms,
      impactIndicators: c.impactIndicators,
      lastModified: c.lastModified,
    }));
  }

  if (!type || type === 'comparison') {
    result.comparisons = getComparisonCards(locale).map((c) => ({
      slug: c.slug,
      title: c.title,
      comparisonType: c.comparisonType,
      entities: c.entities,
      indicator: c.indicator,
      dataPoints: c.dataPoints,
      lastModified: c.lastModified,
    }));
  }

  return NextResponse.json({
    generator: 'Brussels Governance Monitor',
    version: '1.0',
    license: 'All rights reserved — Advice That SRL',
    locale,
    generatedAt: new Date().toISOString(),
    ...result,
  });
}
