// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';
import { routing } from '@/i18n/routing';
import { buildMetadata, canonicalUrl } from '@/lib/metadata';
import { Link } from '@/i18n/navigation';
import { Breadcrumb } from '@/components/breadcrumb';
import type { Metadata } from 'next';

const PATH = '/explainers/brussels-paradox';
/** Date the figures on this page were last checked against their sources. */
const DATE_MODIFIED = '2026-09-19';
/** First commit of this page (8c51a85c). */
const DATE_PUBLISHED = '2026-02-07';

const KEY_FIGURES = ['gdpPps', 'rank', 'gdpShare', 'commuters', 'taxableIncome', 'arope'] as const;
const TABLE_ROWS = ['gdpPps', 'disposableIncome', 'taxableIncome', 'arope', 'unemployment'] as const;
const TABLE_COLUMNS = [
  { key: 'bru', header: 'brussels' },
  { key: 'fla', header: 'flanders' },
  { key: 'wal', header: 'wallonia' },
  { key: 'bel', header: 'belgium' },
] as const;
const SOURCES = [
  'eurostatGdp',
  'eurostatIncome',
  'eurostatAropeEu',
  'eurostatAropeRegions',
  'ibsa',
  'statbelTax',
  'statbelArope',
  'statbelLfs',
  'steunpuntWerk',
  'nbb',
  'financingAct',
] as const;

type LinkHref = ComponentProps<typeof Link>['href'];

/**
 * Internal links, all through next-intl so the path segments are localized.
 * Deliberately no link to the gdp-per-capita-regions and poverty-capital-regions
 * comparisons: their figures contradict this page (fix tracked separately).
 */
const GO_FURTHER: { key: string; href: LinkHref }[] = [
  { key: 'economy', href: { pathname: '/domains/[slug]', params: { slug: 'economy' } } },
  { key: 'employment', href: { pathname: '/domains/[slug]', params: { slug: 'employment' } } },
  { key: 'budget', href: { pathname: '/domains/[slug]', params: { slug: 'budget' } } },
  { key: 'wellbeing', href: { pathname: '/dossiers/[slug]', params: { slug: 'bien-etre' } } },
  { key: 'cpas', href: { pathname: '/dossiers/[slug]', params: { slug: 'cpas-bruxellois' } } },
  { key: 'commuters', href: { pathname: '/glossary', hash: 'navetteurs' } },
  { key: 'federal', href: '/explainers/federal-and-brussels' },
  { key: 'cosmopolitan', href: '/explainers/brussels-cosmopolitan' },
  { key: 'overview', href: '/explainers/brussels-overview' },
  {
    key: 'unemployment',
    href: { pathname: '/comparisons/[slug]', params: { slug: 'unemployment-capital-regions' } },
  },
];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'explainers.brusselsParadox' });
  return buildMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: PATH,
  });
}

export default async function BrusselsParadoxPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'explainers.brusselsParadox' });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  // Same node as the Organization declared in the locale layout's JSON-LD graph.
  const organization = {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'Brussels Governance Monitor',
    url: siteUrl,
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: t('title'),
    description: t('metaDescription'),
    url: canonicalUrl(locale, PATH),
    inLanguage: locale,
    datePublished: DATE_PUBLISHED,
    dateModified: DATE_MODIFIED,
    isAccessibleForFree: true,
    author: organization,
    publisher: organization,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <BrusselsParadoxView />
    </>
  );
}

const h2 = 'text-lg font-semibold text-neutral-900';
const textLink = 'text-brand-700 underline underline-offset-2 hover:text-brand-900';

function BrusselsParadoxView() {
  const t = useTranslations('explainers.brusselsParadox');
  const tb = useTranslations('breadcrumb');
  const tf = useTranslations('footer');

  return (
    <article className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('understand'), href: '/understand' },
          { label: t('breadcrumbLabel') },
        ]} />

        <header className="mb-8">
          <h1 className="mb-3 text-2xl font-bold text-neutral-900">{t('title')}</h1>
          <p className="mb-2 text-base text-neutral-600">{t('subtitle')}</p>
          <p className="text-xs text-neutral-500">
            {t.rich('checked', {
              date: (chunks) => <time dateTime={DATE_MODIFIED}>{chunks}</time>,
            })}
          </p>
        </header>

        <div className="max-w-3xl space-y-8 text-sm leading-relaxed text-neutral-700">
          <p className="text-base leading-relaxed text-neutral-800">{t('answer')}</p>

          <section aria-labelledby="paradox-key-figures">
            <h2 id="paradox-key-figures" className={`mb-4 ${h2}`}>{t('keyFigures.title')}</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {KEY_FIGURES.map((key) => (
                <div key={key} className="flex flex-col rounded-lg bg-neutral-50 p-4">
                  <dt className="order-2 mt-1 text-xs text-neutral-600">{t(`keyFigures.${key}.label`)}</dt>
                  <dd className="order-1 text-lg font-bold text-brand-900">{t(`keyFigures.${key}.value`)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="paradox-gdp" className="space-y-4">
            <h2 id="paradox-gdp" className={h2}>{t('gdp.title')}</h2>
            <p>{t('gdp.p1')}</p>
            <p>{t('gdp.p2')}</p>
          </section>

          <section aria-labelledby="paradox-poverty" className="space-y-4">
            <h2 id="paradox-poverty" className={h2}>{t('poverty.title')}</h2>
            <p>{t('poverty.p1')}</p>
            <p>{t('poverty.p2')}</p>
            <p>{t('poverty.p3')}</p>
            <p>{t('poverty.p4')}</p>

            <figure className="pt-2">
              <div
                className="overflow-x-auto rounded-lg border border-neutral-200"
                role="region"
                aria-labelledby="paradox-table-caption"
                tabIndex={0}
              >
                <table className="w-full min-w-[36rem] text-left text-xs">
                  <caption
                    id="paradox-table-caption"
                    className="px-3 pt-3 pb-2 text-left text-sm font-semibold text-neutral-900"
                  >
                    {t('table.caption')}
                  </caption>
                  <thead className="bg-neutral-50">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-semibold text-neutral-900">{t('table.indicator')}</th>
                      {TABLE_COLUMNS.map(({ key, header }) => (
                        <th key={key} scope="col" className="px-3 py-2 text-right font-semibold text-neutral-900">
                          {t(`table.${header}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {TABLE_ROWS.map((row) => (
                      <tr key={row}>
                        <th scope="row" className="px-3 py-2 font-medium text-neutral-800">
                          {t(`table.rows.${row}.label`)}
                        </th>
                        {TABLE_COLUMNS.map(({ key }) => (
                          <td
                            key={key}
                            className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${key === 'bru' ? 'font-semibold text-brand-900' : ''}`}
                          >
                            {t(`table.rows.${row}.${key}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <figcaption className="mt-2 text-xs text-neutral-500">{t('table.sources')}</figcaption>
            </figure>
          </section>

          <section aria-labelledby="paradox-commuters" className="space-y-4">
            <h2 id="paradox-commuters" className={h2}>{t('commuters.title')}</h2>
            <p>{t('commuters.p1')}</p>
            <p>{t('commuters.p2')}</p>
            <p>{t('commuters.p3')}</p>
            <p>{t('commuters.p4')}</p>
          </section>

          <section aria-labelledby="paradox-finances" className="space-y-4">
            <h2 id="paradox-finances" className={h2}>{t('finances.title')}</h2>
            <p>{t('finances.p1')}</p>
            <p>{t('finances.p2')}</p>
            <p>{t('finances.p3')}</p>
          </section>

          <section aria-labelledby="paradox-belgium" className="space-y-4">
            <h2 id="paradox-belgium" className={h2}>{t('belgium.title')}</h2>
            <p>{t('belgium.p1')}</p>
          </section>

          <nav aria-labelledby="paradox-go-further" className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <h2 id="paradox-go-further" className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-600">
              {t('goFurther.title')}
            </h2>
            <ul className="space-y-2">
              {GO_FURTHER.map(({ key, href }) => (
                <li key={key}>
                  <Link href={href} className={textLink}>
                    {t(`goFurther.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-labelledby="paradox-method" className="space-y-4 border-t border-neutral-200 pt-6">
            <h2 id="paradox-method" className={h2}>{t('method.title')}</h2>
            <p>{t('method.p1')}</p>
            <h3 className="text-sm font-semibold text-neutral-900">{t('method.sourcesTitle')}</h3>
            <ul className="list-disc space-y-2 pl-5">
              {SOURCES.map((key) => (
                <li key={key}>
                  <a
                    href={t(`method.sources.${key}.url`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={textLink}
                  >
                    {t(`method.sources.${key}.label`)}
                    <span className="sr-only"> ({tf('newTab')})</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </article>
  );
}
