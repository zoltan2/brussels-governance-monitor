// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import { getDomainCard, getAllDomainSlugs, getLatestVerification, getDossiersForDomain, getSectorsForDomain, getComparisonsForDomain, getGlossaryForDomain } from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { buildMetadata } from '@/lib/metadata';
import { FallbackBanner } from '@/components/fallback-banner';
import { DraftBanner } from '@/components/draft-banner';
import { MdxContent } from '@/components/mdx-content';
import { ShareButton } from '@/components/share-button';
import { CiteButton } from '@/components/cite-button';
import { FeedbackButton } from '@/components/feedback-button';
import { FreshnessBadge } from '@/components/freshness-badge';
import { VerificationBadge } from '@/components/verification-badge';
import { CardSubscribe } from '@/components/card-subscribe';
import { StatusAccordion } from '@/components/status-accordion';
import { RelatedCards } from '@/components/related-cards';
import { DomainTags } from '@/components/domain-tags';
import { DomainHubNav } from '@/components/domain-hub-nav';
import { TableOfContents } from '@/components/table-of-contents';
import { CollapsibleMetrics } from '@/components/collapsible-metrics';
import { CollapsibleSources } from '@/components/collapsible-sources';
import { HeritageCallout } from '@/components/heritage-callout';
import { Breadcrumb } from '@/components/breadcrumb';

export function generateStaticParams() {
  const slugs = getAllDomainSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const result = getDomainCard(slug, locale as Locale);
  if (!result) return {};

  const { card } = result;
  return buildMetadata({
    locale,
    title: card.title,
    description: card.summary,
    path: `/domains/${slug}`,
    ogParams: `title=${encodeURIComponent(card.title)}&type=domain&status=${card.status}&date=${card.lastModified}&confidence=${card.confidenceLevel}${card.metrics.length > 0 ? `&stats=${encodeURIComponent(JSON.stringify(card.metrics.slice(0, 3).map((m) => ({ label: m.label, value: `${m.value}${m.unit ? ` ${m.unit}` : ''}` }))))}` : ''}`,
  });
}

const statusStyles: Record<string, string> = {
  blocked: 'bg-status-blocked text-white',
  delayed: 'bg-status-delayed text-white',
  ongoing: 'bg-status-ongoing text-white',
  resolved: 'bg-status-resolved text-white',
};

export default async function DomainDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const result = getDomainCard(slug, locale as Locale);
  if (!result) notFound();

  const { card, isFallback } = result;
  const verification = getLatestVerification(slug, 'domain', locale as Locale);
  const relatedDossiers = getDossiersForDomain(slug, locale as Locale);
  const relatedSectors = getSectorsForDomain(slug, locale as Locale);
  const relatedComparisons = getComparisonsForDomain(slug, locale as Locale);
  const relatedGlossary = getGlossaryForDomain(slug, locale as Locale);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: card.title,
    description: card.summary,
    datePublished: card.lastModified,
    dateModified: card.lastModified,
    url: `${siteUrl}/${locale}/domains/${slug}`,
    inLanguage: locale,
    author: {
      '@type': 'Organization',
      name: 'Brussels Governance Monitor',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Brussels Governance Monitor',
      url: siteUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DomainDetail card={card} locale={locale} isFallback={isFallback} verification={verification} relatedDossiers={relatedDossiers} relatedSectors={relatedSectors} relatedComparisons={relatedComparisons} relatedGlossary={relatedGlossary} siteUrl={siteUrl} />
    </>
  );
}

function DomainDetail({
  card,
  locale,
  isFallback,
  verification,
  relatedDossiers,
  relatedSectors,
  relatedComparisons,
  relatedGlossary,
  siteUrl,
}: {
  card: ReturnType<typeof getDomainCard> extends { card: infer C } | null ? C : never;
  locale: string;
  isFallback: boolean;
  verification: ReturnType<typeof getLatestVerification>;
  relatedDossiers: ReturnType<typeof getDossiersForDomain>;
  relatedSectors: ReturnType<typeof getSectorsForDomain>;
  relatedComparisons: ReturnType<typeof getComparisonsForDomain>;
  relatedGlossary: ReturnType<typeof getGlossaryForDomain>;
  siteUrl: string;
}) {
  const t = useTranslations('domains');
  const tb = useTranslations('breadcrumb');
  const tShare = useTranslations('share');
  const tFeedback = useTranslations('feedback');
  const tSub = useTranslations('cardSubscribe');

  const falcLabels: Record<string, string> = {
    fr: 'En bref (lecture facile)',
    nl: 'Kort samengevat (eenvoudige taal)',
    en: 'In brief (easy read)',
    de: 'Kurz gefasst (leichte Sprache)',
  };

  return (
    <article className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        {/* ── HEADER ── */}
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('domains'), href: '/domains' },
          { label: card.title },
        ]} />

        {card.draft && <DraftBanner />}
        {isFallback && <FallbackBanner targetLocale={locale} />}

        <div className="mt-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl font-bold text-neutral-900">{card.title}</h1>
            <span
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-sm font-medium',
                statusStyles[card.status],
              )}
            >
              {t(`status.${card.status}`)}
            </span>
          </div>
          <p className="mt-2 text-sm text-neutral-500">
            {t(`statusCitizen.${card.status}`)}
          </p>
          <div className="mt-3">
            <StatusAccordion title={t('whyStatusTitle')}>
              {t(`whyStatus.${card.slug}`)}
            </StatusAccordion>
          </div>
        </div>

        {/* Metadata line: confidence + freshness + share + cite */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium',
              card.confidenceLevel === 'official' && 'text-brand-700',
              card.confidenceLevel === 'estimated' && 'text-status-delayed',
              card.confidenceLevel === 'unconfirmed' && 'text-neutral-500',
            )}
            title={t(`confidenceCitizen.${card.confidenceLevel}`)}
          >
            {t(`confidence.${card.confidenceLevel}`)}
          </span>
          <FreshnessBadge lastModified={card.lastModified} locale={locale} />
          <ShareButton
            url={`${siteUrl}/${locale}/domains/${card.slug}`}
            title={card.title}
            description={card.summary}
            labels={{ share: tShare('share'), copyLink: tShare('copyLink'), copied: tShare('copied'), shareVia: tShare('shareVia'), email: tShare('email') }}
          />
          <CiteButton
            url={`${siteUrl}/${locale}/domains/${card.slug}`}
            title={card.title}
            date={card.lastModified}
            locale={locale}
            labels={{ cite: tShare('cite'), standard: tShare('standard'), academic: tShare('academic'), copy: tShare('copy'), copied: tShare('citationCopied'), exportBibtex: tShare('exportBibtex'), close: tShare('close') }}
          />
        </div>

        <p className="mb-3 text-base leading-relaxed text-neutral-600">{card.summary}</p>

        <div className="mb-4">
          <DomainTags domain={card.slug} locale={locale} />
        </div>

        {/* FALC — collapsible, closed by default */}
        {card.summaryFalc && (
          <details className="mb-6 rounded-lg border border-blue-200 bg-blue-50/50">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-700">
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {falcLabels[locale] ?? falcLabels.fr}
            </summary>
            <div className="border-t border-blue-200 px-4 pb-3 pt-2">
              <p className="text-sm leading-relaxed text-neutral-700">{card.summaryFalc}</p>
            </div>
          </details>
        )}

        {/* ── NAVIGATION ── */}
        <DomainHubNav
          locale={locale}
          sectors={relatedSectors}
          dossiers={relatedDossiers}
          comparisons={relatedComparisons}
          glossaryTerms={relatedGlossary}
        />

        <TableOfContents locale={locale} />

        {/* ── KEY METRICS — 5 visible, rest collapsible ── */}
        <CollapsibleMetrics metrics={card.metrics} locale={locale} />

        {/* ── EDITORIAL BODY ── */}
        <div className="mt-4" data-mdx-content {...(isFallback && card.locale !== locale ? { lang: card.locale } : {})}>
          <MdxContent code={card.content} />
        </div>

        {/* ── HERITAGE CONTEXT — mini callout linking to archive ── */}
        <HeritageCallout slug={card.slug} locale={locale} type="domain" />

        {/* ── CONCLUSION — concrete impact (after analysis, not before) ── */}
        <div className="mt-8 rounded-lg border border-brand-200 bg-brand-50 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-800">
            {t('concreteImpactTitle')}
          </h2>
          <p className="text-sm leading-relaxed text-brand-900">
            {t(`concreteImpact.${card.slug}`)}
          </p>
        </div>

        {/* ── TRANSPARENCY — "Ce que BGM ne dit pas" (before sources) ── */}
        <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {t('notSaidTitle')}
          </h2>
          <p className="text-xs leading-relaxed text-neutral-600 italic">
            {t(`notSaid.${card.slug}`)}
          </p>
        </div>

        {/* ── SOURCES — collapsible (5 visible, expand all) ── */}
        <CollapsibleSources
          sources={card.sources}
          lastModified={card.lastModified}
          locale={locale}
        />

        {/* ── FOOTER ── */}
        {relatedSectors.length === 0 && <RelatedCards domain={card.slug} />}

        {verification && (
          <div className="mt-8">
            <VerificationBadge verification={verification} locale={locale} />
          </div>
        )}

        <div className="mt-8">
          <CardSubscribe
            topic={card.slug}
            locale={locale}
            labels={{
              title: tSub('title'),
              emailPlaceholder: tSub('emailPlaceholder'),
              submit: tSub('submit'),
              submitting: tSub('submitting'),
              success: tSub('success'),
              successExisting: tSub('successExisting'),
              error: tSub('error'),
              privacy: tSub('privacy'),
            }}
          />
        </div>

        <div className="mt-8">
          <FeedbackButton
            cardTitle={card.title}
            cardType="domain"
            cardSlug={card.slug}
            labels={{
              button: tFeedback('button'),
              title: tFeedback('title'),
              typeLabel: tFeedback('typeLabel'),
              types: {
                error: tFeedback('types.error'),
                correction: tFeedback('types.correction'),
                source: tFeedback('types.source'),
                other: tFeedback('types.other'),
              },
              messageLabel: tFeedback('messageLabel'),
              messagePlaceholder: tFeedback('messagePlaceholder'),
              emailLabel: tFeedback('emailLabel'),
              emailPlaceholder: tFeedback('emailPlaceholder'),
              submit: tFeedback('submit'),
              submitting: tFeedback('submitting'),
              success: tFeedback('success'),
              errorMessage: tFeedback('errorMessage'),
              cancel: tFeedback('cancel'),
            }}
          />
        </div>
      </div>
    </article>
  );
}
