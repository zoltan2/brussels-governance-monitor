// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getDossierCard, getDossierByLocalizedSlug, getLocalizedSlug } from '@/lib/content';
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
  // Spec scrolly D §5 + spec slugs localisés §3.3 : pour chaque dossier
  // allowlistée scrolly, émet 1 URL par locale native, AVEC le slug localisé
  // de cette locale (ou fallback canonique si localizedSlugs absent).
  const params: ScrollyPageParams[] = [];
  for (const canonicalSlug of SCROLLY_ENABLED_DOSSIERS) {
    for (const locale of routing.locales) {
      const result = getDossierCard(canonicalSlug, locale as Locale);
      if (result && !result.isFallback) {
        const slugForLocale = getLocalizedSlug(result.card, locale as Locale);
        params.push({ locale, slug: slugForLocale });
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

  // Spec §3.3 + scrolly D §3.4 : lookup par slug localisé puis check allowlist
  // sur le slug CANONIQUE (l'allowlist est indexée par slug canonique).
  const result = getDossierByLocalizedSlug(slug, locale as Locale);
  if (!result || result.isFallback) return {};
  if (!isScrollyEnabled(result.card.slug)) return {};
  const { card } = result;

  // Canonical pointe vers la structurée AVEC le slug localisé natif de la locale courante
  const canonicalUrl = `https://governance.brussels/${locale}/dossiers/${slug}`;

  return {
    title: `${card.title} — vue immersive`,
    description: card.summary,
    // Spec D §7.1: noindex initial during pilot, switch to index after validation
    robots: { index: false, follow: false },
    alternates: {
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

  // Spec §3.3 + scrolly D §3.4 : lookup par slug localisé d'abord, puis check
  // allowlist sur slug canonique. Belt and suspenders : require native translation.
  const result = getDossierByLocalizedSlug(slug, locale as Locale);
  if (!result || result.isFallback) notFound();
  if (!isScrollyEnabled(result.card.slug)) notFound();
  const { card } = result;

  return (
    <article className="min-h-screen bg-neutral-50">
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
