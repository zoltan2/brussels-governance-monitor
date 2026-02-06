import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import { getDomainCard, getAllDomainSlugs } from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
import { formatDate, cn } from '@/lib/utils';
import { FallbackBanner } from '@/components/fallback-banner';
import { MdxContent } from '@/components/mdx-content';
import { ShareButton } from '@/components/share-button';
import { Link } from '@/i18n/navigation';

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    title: card.title,
    description: card.summary,
    openGraph: {
      title: card.title,
      description: card.summary,
      type: 'article',
      locale,
      url: `${siteUrl}/${locale}/domains/${slug}`,
      images: [
        {
          url: `${siteUrl}/${locale}/og?title=${encodeURIComponent(card.title)}&type=domain&status=${card.status}`,
          width: 1200,
          height: 630,
          alt: card.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: card.title,
      description: card.summary,
    },
  };
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: card.title,
    description: card.summary,
    dateModified: card.lastModified,
    url: `${siteUrl}/${locale}/domains/${slug}`,
    inLanguage: locale,
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
      <DomainDetail card={card} locale={locale} isFallback={isFallback} />
    </>
  );
}

function DomainDetail({
  card,
  locale,
  isFallback,
}: {
  card: ReturnType<typeof getDomainCard> extends { card: infer C } | null ? C : never;
  locale: string;
  isFallback: boolean;
}) {
  const t = useTranslations('domains');

  return (
    <article className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href="/"
          className="mb-6 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t('backToHome')}
        </Link>

        {isFallback && <FallbackBanner targetLocale={locale} />}

        <div className="mt-4 mb-6 flex items-start justify-between gap-3">
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

        <div className="mb-6">
          <ShareButton
            title={card.title}
            text={card.summary}
            label={t('share')}
            copiedLabel={t('copied')}
          />
        </div>

        <p className="mb-6 text-base leading-relaxed text-neutral-600">{card.summary}</p>

        {card.metrics.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              {t('metrics')}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {card.metrics.map((metric) => (
                <div key={metric.label} className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-2xl font-bold text-brand-900">
                    {metric.value}
                    {metric.unit && (
                      <span className="ml-1 text-sm font-normal text-neutral-500">
                        {metric.unit}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <MdxContent code={card.content} />
        </div>

        <div className="mt-10 border-t border-neutral-200 pt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t('sources')}
          </h2>
          <ul className="space-y-2">
            {card.sources.map((source) => (
              <li key={source.url} className="text-sm">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-700 underline underline-offset-2 hover:text-brand-900"
                >
                  {source.label}
                </a>
                <span className="ml-2 text-xs text-neutral-400">
                  ({t('accessedAt', { date: formatDate(source.accessedAt, locale) })})
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs text-neutral-400">
            {t('lastModified', { date: formatDate(card.lastModified, locale) })}
          </p>
        </div>
      </div>
    </article>
  );
}
