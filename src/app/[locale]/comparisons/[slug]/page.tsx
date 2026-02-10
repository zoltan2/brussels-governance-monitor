import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import { getComparisonCard, getAllComparisonSlugs } from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
import { formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/metadata';
import { FallbackBanner } from '@/components/fallback-banner';
import { DraftBanner } from '@/components/draft-banner';
import { MdxContent } from '@/components/mdx-content';
import { ShareButton } from '@/components/share-button';
import { CiteButton } from '@/components/cite-button';
import { FeedbackButton } from '@/components/feedback-button';
import { FreshnessBadge } from '@/components/freshness-badge';
import { Link } from '@/i18n/navigation';

export function generateStaticParams() {
  const slugs = getAllComparisonSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const result = getComparisonCard(slug, locale as Locale);
  if (!result) return {};

  const { card } = result;
  return buildMetadata({
    locale,
    title: card.title,
    description: card.indicator,
    path: `/comparisons/${slug}`,
    ogParams: `title=${encodeURIComponent(card.title)}&type=comparison`,
  });
}

export default async function ComparisonDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const result = getComparisonCard(slug, locale as Locale);
  if (!result) notFound();

  const { card, isFallback } = result;

  return <ComparisonDetail card={card} locale={locale} isFallback={isFallback} />;
}

function ComparisonDetail({
  card,
  locale,
  isFallback,
}: {
  card: ReturnType<typeof getComparisonCard> extends { card: infer C } | null ? C : never;
  locale: string;
  isFallback: boolean;
}) {
  const t = useTranslations('comparisons');
  const tCite = useTranslations('cite');
  const tFeedback = useTranslations('feedback');

  return (
    <article className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href="/comparisons"
          className="mb-6 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('backToList')}
        </Link>

        {card.draft && <DraftBanner />}
        {isFallback && <FallbackBanner targetLocale={locale} />}

        <h1 className="mt-4 mb-4 text-3xl font-bold text-neutral-900">{card.title}</h1>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <FreshnessBadge lastModified={card.lastModified} locale={locale} />
          <ShareButton
            title={card.title}
            text={card.indicator}
            label={t('share')}
            copiedLabel={t('copied')}
          />
          <CiteButton
            title={card.title}
            lastModified={card.lastModified}
            label={tCite('label')}
            copiedLabel={tCite('copied')}
          />
        </div>

        <p className="mb-6 text-base text-neutral-600">{card.indicator}</p>

        <div className="mb-6 flex flex-wrap gap-2">
          {card.entities.map((e) => (
            <span
              key={e.code}
              className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-700"
            >
              {e.name} ({e.code})
            </span>
          ))}
        </div>

        {card.dataPoints.length > 0 && (
          <div className="mb-8 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="py-2 pr-4 font-semibold text-neutral-500">{t('entity')}</th>
                  <th className="py-2 pr-4 font-semibold text-neutral-500">{t('value')}</th>
                  <th className="py-2 font-semibold text-neutral-500">{t('date')}</th>
                </tr>
              </thead>
              <tbody>
                {card.dataPoints.map((dp, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="py-2 pr-4 font-medium text-neutral-700">{dp.entity}</td>
                    <td className="py-2 pr-4 text-neutral-600">{dp.value}</td>
                    <td className="py-2 text-neutral-400">{formatDate(dp.date, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mb-6 rounded-lg bg-neutral-50 p-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {t('methodology')}
          </h2>
          <p className="text-sm text-neutral-600">{card.methodology}</p>
        </div>

        {card.caveat && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
              {t('caveat')}
            </h2>
            <p className="text-sm text-neutral-700">{card.caveat}</p>
          </div>
        )}

        <div className="mt-8">
          <MdxContent code={card.content} />
        </div>

        <div className="mt-8 border-t border-neutral-200 pt-4">
          <p className="text-xs text-neutral-400">
            {t('source')}: <a href={card.sourceDataset.url} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">{card.sourceDataset.name}</a>
          </p>
          <p className="mt-2 text-xs text-neutral-400">
            {t('lastModified', { date: formatDate(card.lastModified, locale) })}
          </p>
        </div>

        <div className="mt-8">
          <FeedbackButton
            cardTitle={card.title}
            cardType="comparison"
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
