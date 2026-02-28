// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Breadcrumb } from '@/components/breadcrumb';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    fr: 'Accessibilite',
    nl: 'Toegankelijkheid',
    en: 'Accessibility',
    de: 'Barrierefreiheit',
  };
  const descriptions: Record<string, string> = {
    fr: 'Declaration d\'accessibilite du Brussels Governance Monitor — conformite WCAG 2.1 AA.',
    nl: 'Toegankelijkheidsverklaring van de Brussels Governance Monitor — WCAG 2.1 AA-conformiteit.',
    en: 'Accessibility statement for the Brussels Governance Monitor — WCAG 2.1 AA conformance.',
    de: 'Barrierefreiheitserklarung des Brussels Governance Monitor — WCAG 2.1 AA-Konformitat.',
  };
  return buildMetadata({
    locale,
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    path: '/accessibility',
  });
}

export default async function AccessibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('accessibility');
  const tb = await getTranslations('breadcrumb');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb
          items={[
            { label: tb('home'), href: '/' },
            { label: tb('transparency'), href: '/transparency' },
            { label: t('title') },
          ]}
        />

        <article>
          <h1 className="mb-8 text-2xl font-bold text-neutral-900">
            {t('title')}
          </h1>

          <div className="space-y-6 text-sm leading-relaxed text-neutral-600">
            {/* Intro */}
            <p>{t('intro')}</p>

            {/* Conformance status */}
            <h2 className="text-lg font-semibold text-neutral-900">
              {t('conformanceTitle')}
            </h2>
            <p>{t('conformanceText')}</p>

            {/* Measures taken */}
            <h2 className="text-lg font-semibold text-neutral-900">
              {t('measuresTitle')}
            </h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>{t('measure1')}</li>
              <li>{t('measure2')}</li>
              <li>{t('measure3')}</li>
              <li>{t('measure4')}</li>
              <li>{t('measure5')}</li>
              <li>{t('measure6')}</li>
              <li>{t('measure7')}</li>
            </ul>

            {/* Technologies used */}
            <h2 className="text-lg font-semibold text-neutral-900">
              {t('techTitle')}
            </h2>
            <p>{t('techText')}</p>

            {/* Linguistic accessibility */}
            <h2 className="text-lg font-semibold text-neutral-900">
              {t('linguisticTitle')}
            </h2>
            <p>{t('linguisticText')}</p>

            {/* Plain language */}
            <h2 className="text-lg font-semibold text-neutral-900">
              {t('plainLanguageTitle')}
            </h2>
            <p>{t('plainLanguageText')}</p>

            {/* Known limitations */}
            <h2 className="text-lg font-semibold text-neutral-900">
              {t('limitationsTitle')}
            </h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>{t('limitation1')}</li>
              <li>{t('limitation2')}</li>
            </ul>

            {/* AnySurfer */}
            <p>{t('anysurferText')}</p>

            {/* Feedback */}
            <h2 className="text-lg font-semibold text-neutral-900">
              {t('feedbackTitle')}
            </h2>
            <p>{t('feedbackText')}</p>

            {/* Statement date */}
            <p className="mt-8 text-xs text-neutral-500">
              {t('statementDate')}
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
