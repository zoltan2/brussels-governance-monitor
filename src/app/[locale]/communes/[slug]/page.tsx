import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import { getCommuneCard, getAllCommuneSlugs, getDomainCard, getSectorCard } from '@/lib/content';
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
import { CardSubscribe } from '@/components/card-subscribe';
import { TransparencyGrid } from '@/components/transparency-grid';
import { Link } from '@/i18n/navigation';
import { Breadcrumb } from '@/components/breadcrumb';

export function generateStaticParams() {
  const slugs = getAllCommuneSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const result = getCommuneCard(slug, locale as Locale);
  if (!result) return {};

  const { card } = result;
  return buildMetadata({
    locale,
    title: card.title,
    description: `${card.mayor} (${card.mayorParty}) — ${card.transparencyScore}/${card.transparencyTotal}`,
    path: `/communes/${slug}`,
    ogParams: `title=${encodeURIComponent(card.title)}&type=commune`,
  });
}

export default async function CommuneDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const result = getCommuneCard(slug, locale as Locale);
  if (!result) notFound();

  const { card, isFallback } = result;

  return <CommuneDetail card={card} locale={locale as Locale} isFallback={isFallback} />;
}

function CommuneDetail({
  card,
  locale,
  isFallback,
}: {
  card: ReturnType<typeof getCommuneCard> extends { card: infer C } | null ? C : never;
  locale: Locale;
  isFallback: boolean;
}) {
  const t = useTranslations('communes');
  const tb = useTranslations('breadcrumb');
  const tCite = useTranslations('cite');
  const tFeedback = useTranslations('feedback');
  const tSub = useTranslations('cardSubscribe');

  // Resolve related domain cards
  const relatedDomainCards = card.relatedDomains
    .map((slug) => getDomainCard(slug, locale))
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => r.card);

  // Resolve related sector cards
  const relatedSectorCards = card.relatedSectors
    .map((slug) => getSectorCard(slug, locale))
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => r.card);

  // Group sources by type
  const sourcesByType = card.sources.reduce(
    (acc, s) => {
      if (!acc[s.type]) acc[s.type] = [];
      acc[s.type].push(s);
      return acc;
    },
    {} as Record<string, typeof card.sources>,
  );

  return (
    <article className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Breadcrumb
          items={[
            { label: tb('home'), href: '/' },
            { label: tb('communes'), href: '/communes' },
            { label: card.title },
          ]}
        />

        {card.draft && <DraftBanner />}
        {isFallback && <FallbackBanner targetLocale={locale} />}

        {/* Header */}
        <h1 className="mt-4 mb-2 text-3xl font-bold text-neutral-900">{card.title}</h1>
        <div className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
          <span>
            {t('mayor')} : {card.mayor} ({card.mayorParty})
          </span>
          <span>
            {t('coalition')} : {card.coalition.join(', ')}
          </span>
        </div>
        <div className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
          <span>{t('population')} : {card.population.toLocaleString('fr-BE')}</span>
          <span>{t('postalCode')} : {card.postalCode}</span>
          {card.area && <span>{t('area')} : {card.area} km²</span>}
          <span>{t('councilSeats')} : {card.councilSeats}</span>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <FreshnessBadge lastModified={card.lastModified} locale={locale} />
          <ShareButton
            title={card.title}
            text={`${card.mayor} (${card.mayorParty})`}
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

        {/* Transparency grid */}
        <div className="mb-8">
          <TransparencyGrid
            indicators={card.transparencyIndicators}
            score={card.transparencyScore}
            total={card.transparencyTotal}
          />
        </div>

        {/* Key figures */}
        {card.keyFigures.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t('keyFigures')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {card.keyFigures.map((fig) => (
                <div key={fig.label} className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-2xl font-bold text-brand-900">
                    {fig.value}
                    {fig.unit && (
                      <span className="ml-1 text-xs font-normal text-neutral-500">{fig.unit}</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">{fig.label}</p>
                  <p className="text-xs text-neutral-400">{fig.source}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts */}
        {card.alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t('alerts')}
            </h2>
            <ul className="space-y-2">
              {card.alerts.map((alert) => (
                <li
                  key={`${alert.date}-${alert.label}`}
                  className={`rounded-lg border p-3 text-sm ${
                    alert.severity === 'critical'
                      ? 'border-amber-300 bg-amber-50'
                      : alert.severity === 'warning'
                        ? 'border-amber-200 bg-amber-50/50'
                        : 'border-neutral-200 bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-neutral-700">{alert.label}</span>
                    <span className="shrink-0 text-xs text-neutral-500">{formatDate(alert.date, locale)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* MDX content */}
        <div className="mt-8">
          <MdxContent code={card.content} />
        </div>

        {/* Related domains */}
        {relatedDomainCards.length > 0 && (
          <div className="mt-10 border-t border-neutral-200 pt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t('relatedDomains')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedDomainCards.map((d) => (
                <Link
                  key={d.slug}
                  href={{ pathname: '/domains/[slug]', params: { slug: d.slug } }}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-brand-700 hover:bg-neutral-50"
                >
                  {d.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related sectors */}
        {relatedSectorCards.length > 0 && (
          <div className="mt-6 border-t border-neutral-200 pt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t('relatedSectors')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedSectorCards.map((s) => (
                <Link
                  key={s.slug}
                  href={{ pathname: '/sectors/[slug]', params: { slug: s.slug } }}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-brand-700 hover:bg-neutral-50"
                >
                  {s.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sources grouped by type */}
        <div className="mt-10 border-t border-neutral-200 pt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {t('sources')}
          </h2>
          {Object.entries(sourcesByType).map(([type, sources]) => (
            <div key={type} className="mb-4">
              <h3 className="mb-2 text-xs font-medium text-neutral-400">
                {t(`sourceTypes.${type}`)}
              </h3>
              <ul className="space-y-1">
                {sources.map((s) => (
                  <li key={s.url} className="text-sm">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-700 underline underline-offset-2 hover:text-brand-900"
                    >
                      {s.label}
                    </a>
                    <span className="ml-2 text-xs text-neutral-400">
                      ({formatDate(s.accessedAt, locale)})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-neutral-500">
          {t('lastModified', { date: formatDate(card.lastModified, locale) })}
        </p>

        <div className="mt-8">
          <CardSubscribe
            topic="communes"
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
            cardType="commune"
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
