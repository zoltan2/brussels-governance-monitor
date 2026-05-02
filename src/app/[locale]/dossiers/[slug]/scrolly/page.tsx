// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getDossierCard } from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
import { isScrollyEnabled, SCROLLY_ENABLED_DOSSIERS } from '@/lib/scrolly-allowlist';
import { MdxContent } from '@/components/mdx-content';
import { DensityProvider } from '@/components/dossier/density/density-context';
import { DensityToggle } from '@/components/dossier/density/density-toggle';
import { ScrollyHeader } from '@/components/dossier/scrolly/scrolly-header';

interface ScrollyPageParams {
  locale: string;
  slug: string;
}

/**
 * Statically generates routes only for slug + locale combinations where:
 * 1. The slug is in SCROLLY_ENABLED_DOSSIERS allowlist
 * 2. A native (non-fallback) MDX exists for that locale
 *
 * Without #2, NL/EN/DE routes for CPAS would render the FR fallback —
 * worse than 404 from a SEO/UX perspective. We require native translation.
 *
 * Spec: bgm-ops/specs/2026-05-02-option-d-scrolly-cpas-pilot.md §5
 */
export async function generateStaticParams(): Promise<ScrollyPageParams[]> {
  const params: ScrollyPageParams[] = [];
  for (const slug of SCROLLY_ENABLED_DOSSIERS) {
    for (const locale of routing.locales) {
      const result = getDossierCard(slug, locale as Locale);
      if (result && !result.isFallback) {
        params.push({ locale, slug });
      }
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ScrollyPageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isScrollyEnabled(slug)) return {};

  const result = getDossierCard(slug, locale as Locale);
  if (!result || result.isFallback) return {};
  const { card } = result;

  const canonicalUrl = `https://governance.brussels/${locale}/dossiers/${slug}`;

  return {
    title: `${card.title} — vue immersive`,
    description: card.summary,
    // Spec §7.1: noindex initial during pilot, switch to index after validation
    robots: { index: false, follow: false },
    alternates: {
      // Spec §7.1+§7.3: canonical points to structured page (decision review at 6-12 months)
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${card.title} — vue immersive`,
      description: card.summary,
      type: 'article',
      locale: `${locale}_BE`,
      url: `https://governance.brussels/${locale}/dossiers/${slug}/scrolly`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${card.title} — vue immersive`,
      description: card.summary,
    },
  };
}

export default async function ScrollyPage({
  params,
}: {
  params: Promise<ScrollyPageParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // Spec §3.4: 404 for non-allowlisted slugs
  if (!isScrollyEnabled(slug)) notFound();

  const result = getDossierCard(slug, locale as Locale);
  // Belt and suspenders (spec §5): require native translation, never render
  // FR fallback in NL/EN/DE scrolly context.
  if (!result || result.isFallback) notFound();
  const { card } = result;

  return (
    <article className="min-h-screen bg-white">
      <ScrollyHeader slug={slug} locale={locale} lastModified={card.lastModified} />
      <DensityProvider>
        <div className="mx-auto max-w-3xl px-4 pb-24">
          <DensityToggle />
          <h1 className="mb-8 mt-2 text-4xl font-bold text-neutral-900">{card.title}</h1>
          <MdxContent code={card.content} metrics={card.metrics} />
        </div>
      </DensityProvider>
    </article>
  );
}
