import { NextResponse } from 'next/server';
import { getDomainCards } from '@/lib/content';
import type { Locale } from '@/i18n/routing';

const VALID_LOCALES = ['fr', 'nl', 'en', 'de'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = (searchParams.get('locale') || 'fr') as Locale;

  if (!VALID_LOCALES.includes(locale)) {
    return NextResponse.json(
      { error: `Invalid locale. Use: ${VALID_LOCALES.join(', ')}` },
      { status: 400 },
    );
  }

  const cards = getDomainCards(locale);
  const metrics = cards.flatMap((card) =>
    card.metrics.map((m) => ({
      domain: card.domain,
      domainTitle: card.title,
      label: m.label,
      value: m.value,
      unit: m.unit || null,
      source: m.source,
      date: m.date,
      confidenceLevel: card.confidenceLevel,
    })),
  );

  return NextResponse.json({
    generator: 'Brussels Governance Monitor',
    version: '1.0',
    license: 'All rights reserved — Advice That SRL',
    locale,
    generatedAt: new Date().toISOString(),
    count: metrics.length,
    metrics,
  });
}
