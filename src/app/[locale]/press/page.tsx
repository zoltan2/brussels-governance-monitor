// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { getPressMentions } from '@/lib/press';
import { getPressFacts, pressFactPath } from '@/lib/press-facts';
import { buildPressJsonLd } from '@/lib/press-jsonld';
import { getPressStats } from '@/lib/site-stats';
import { buildMetadata, canonicalUrl } from '@/lib/metadata';
import { PresseView } from '@/components/presse/presse-view';
import type { Locale } from '@/i18n/routing';
import type { Metadata } from 'next';

/**
 * « Presse & données » : la page presse, élargie. Même route qu'avant
 * (/fr/presse, /nl/pers, /en/press, /de/presse), aucune redirection.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'press' });
  return buildMetadata({
    locale,
    title: t('seoTitle'),
    absoluteTitle: true,
    description: t('seoDescription'),
    path: '/press',
  });
}

export default async function PressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('press');

  const mentions = getPressMentions(locale as Locale);
  const facts = getPressFacts(locale as Locale).map((f) => ({
    ...f,
    pageUrl: canonicalUrl(locale, pressFactPath(f)),
  }));
  const stats = getPressStats();

  const jsonLd = buildPressJsonLd({
    siteUrl,
    pageUrl: canonicalUrl(locale, '/press'),
    locale,
    name: t('pageTitle'),
    description: t('seoDescription'),
    mentions,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <PresseView locale={locale} stats={stats} facts={facts} mentions={mentions} />
    </>
  );
}
